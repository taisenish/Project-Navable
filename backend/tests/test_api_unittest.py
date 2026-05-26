import unittest

from sqlmodel import Session, SQLModel, create_engine

from src.api.routes import (
    generate_route,
    get_user_preferences,
    health,
    list_alerts,
    list_pois,
    set_user_preferences,
)
from src.models.schemas import (
    AccessibilityPreferences,
    Coordinate,
    PoiType,
    RouteRequest,
    UserPreferenceRecord,
)
from src.services.auth_service import GoogleAuthService
from src.services.google_maps_service import GoogleMapsService
from src.services.preference_store import PreferenceStore
from src.services.routing_engine import RoutingEngine
from src.services.uw_data_service import UWDataService


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.uw_data = UWDataService()
        cls.maps = GoogleMapsService()
        cls.engine = RoutingEngine(cls.uw_data, cls.maps)
        cls.test_engine = create_engine('sqlite://', connect_args={'check_same_thread': False})
        SQLModel.metadata.create_all(cls.test_engine)
        cls.session = Session(cls.test_engine)
        cls.pref_store = PreferenceStore(cls.session)
        cls.auth_service = GoogleAuthService(cls.session, oauth_client_id=None)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.session.close()

    def test_health(self) -> None:
        self.assertEqual(health()['status'], 'ok')

    def test_poi_list(self) -> None:
        data = list_pois(type=None, data=self.uw_data)
        self.assertGreaterEqual(len(data), 1)
        elevators = list_pois(type=PoiType.elevator, data=self.uw_data)
        self.assertTrue(all(item.type == PoiType.elevator for item in elevators))

    def test_alert_list(self) -> None:
        alerts = list_alerts(data=self.uw_data)
        self.assertIsInstance(alerts, list)
        self.assertGreaterEqual(len(alerts), 1)

    def test_create_or_update_alert(self) -> None:
        from src.models.schemas import Alert, AlertSeverity, Coordinate
        from src.routes.data import create_or_update_alert
        new_alert = Alert(
            id="test-alert-99",
            title="Test Alert",
            description="Test Description",
            severity=AlertSeverity.info,
            location=Coordinate(lat=47.655, lng=-122.303),
            status="resolved",
            is_resolved=True
        )
        res = create_or_update_alert(alert=new_alert, data=self.uw_data)
        self.assertEqual(res.id, "test-alert-99")
        self.assertEqual(res.status, "resolved")
        self.assertTrue(res.is_resolved)
        
        alerts = list_alerts(data=self.uw_data)
        self.assertTrue(any(a.id == "test-alert-99" for a in alerts))

        import json
        file_path = self.uw_data.data_dir / "uw_alerts.json"
        if file_path.exists():
            with file_path.open("r", encoding="utf-8") as f:
                alerts_list = json.load(f)
            alerts_list = [a for a in alerts_list if a.get("id") != "test-alert-99"]
            with file_path.open("w", encoding="utf-8") as f:
                json.dump(alerts_list, f, indent=2)
            self.uw_data.load_alerts.cache_clear()

    def test_set_and_get_preferences(self) -> None:
        record = UserPreferenceRecord(
            user_id='demo-user',
            preferences=AccessibilityPreferences(
                avoid_stairs=True,
                max_slope_percent=6,
                allowed_surfaces=['paved'],
                avoid_closures=True,
            ),
        )
        saved = set_user_preferences(record=record, store=self.pref_store)
        loaded = get_user_preferences(user_id='demo-user', store=self.pref_store)
        self.assertEqual(saved.preferences.max_slope_percent, loaded.preferences.max_slope_percent)

    def test_route_generation(self) -> None:
        payload = RouteRequest(
            origin=Coordinate(lat=47.6517, lng=-122.3082),
            destination=Coordinate(lat=47.6557, lng=-122.3094),
            preferences=AccessibilityPreferences(
                avoid_stairs=True,
                max_slope_percent=8,
                allowed_surfaces=['paved', 'brick', 'mixed'],
                avoid_closures=True,
            ),
        )
        route = generate_route(payload=payload, engine=self.engine)
        self.assertGreater(route.leg.distance_meters, 0)
        self.assertGreaterEqual(len(route.polyline), 2)
        self.assertEqual(route.source, "uw+google")

    def test_route_off_campus_fallback(self) -> None:
        payload = RouteRequest(
            origin=Coordinate(lat=47.7000, lng=-122.3000),
            destination=Coordinate(lat=47.6557, lng=-122.3094),
            preferences=AccessibilityPreferences(
                avoid_stairs=True,
                max_slope_percent=8.0,
                allowed_surfaces=['paved', 'brick', 'mixed'],
                avoid_closures=True,
            ),
        )
        route = generate_route(payload=payload, engine=self.engine)
        self.assertEqual(route.source, "fallback")
        self.assertFalse(route.is_fully_accessible)
        self.assertTrue(any("off-campus" in w.lower() or "off-campus" in route.warnings[0].lower() for w in route.warnings))

    def test_route_extreme_slope_pruning_relaxed(self) -> None:
        payload = RouteRequest(
            origin=Coordinate(lat=47.6517, lng=-122.3082),
            destination=Coordinate(lat=47.6557, lng=-122.3094),
            preferences=AccessibilityPreferences(
                avoid_stairs=True,
                max_slope_percent=0.5,
                allowed_surfaces=['paved', 'brick', 'mixed'],
                avoid_closures=True,
            ),
        )
        route = generate_route(payload=payload, engine=self.engine)
        self.assertEqual(route.source, "uw+google")
        self.assertFalse(route.is_fully_accessible)
        self.assertGreater(len(route.warnings), 0)
        self.assertTrue(any("has: slope" in w.lower() or "slope" in w.lower() for w in route.warnings))

    def test_upsert_google_user(self) -> None:
        user, is_new = self.auth_service.upsert_user(
            {
                'sub': 'google-sub-1',
                'email': 'student@uw.edu',
                'name': 'UW Student',
                'picture': 'https://example.com/avatar.jpg',
            }
        )
        self.assertEqual(user.user_id, 'google-sub-1')
        self.assertEqual(user.email, 'student@uw.edu')
        self.assertTrue(is_new)

    def test_off_campus_stitch(self) -> None:
        class MockMapsService:
            def __init__(self, api_key="fake-key"):
                self.api_key = api_key
            def get_walking_directions(self, destination_lat, destination_lng, origin_lat, origin_lng):
                return {
                    'overview_polyline': '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                    'steps': [
                        {
                            'instruction': 'Head north on Greek Row Ave',
                            'distance_text': '100 m',
                            'distance_meters': 100,
                            'duration_text': '1 min',
                            'end_location': {'lat': 47.6600, 'lng': -122.3080}
                        }
                    ]
                }
        
        mock_maps_api = MockMapsService()
        engine_with_stitch = RoutingEngine(self.uw_data, self.maps, mock_maps_api)
        
        payload = RouteRequest(
            origin=Coordinate(lat=47.6617, lng=-122.3082),
            destination=Coordinate(lat=47.6539, lng=-122.3078),
            preferences=AccessibilityPreferences(
                avoid_stairs=True,
                max_slope_percent=8.0,
                allowed_surfaces=['paved', 'brick', 'mixed'],
                avoid_closures=True,
            ),
        )
        route = generate_route(payload=payload, engine=engine_with_stitch)
        self.assertEqual(route.source, "uw+google")
        self.assertTrue(any("Greek Row" in step.instruction for step in route.leg.steps))

    def test_custom_direction_aggregation(self) -> None:
        payload = RouteRequest(
            origin=Coordinate(lat=47.6539, lng=-122.3078),
            destination=Coordinate(lat=47.6557, lng=-122.3094),
            preferences=AccessibilityPreferences(
                avoid_stairs=True,
                max_slope_percent=8.0,
                allowed_surfaces=['paved', 'brick', 'mixed'],
                avoid_closures=True,
            ),
        )
        route = generate_route(payload=payload, engine=self.engine)
        self.assertEqual(route.source, "uw+google")
        self.assertGreater(len(route.leg.steps), 0)
        
        campus_steps = [
            s for s in route.leg.steps 
            if "campus walkway" in s.instruction 
            and not s.instruction.startswith("Walk from")
        ]
        self.assertGreater(len(campus_steps), 0)
        
        first_campus_step = campus_steps[0]
        self.assertIn("Head", first_campus_step.instruction)
        self.assertIn("ft", first_campus_step.instruction)
        self.assertIsNotNone(first_campus_step.end_location)
        self.assertIsInstance(first_campus_step.end_location.lat, float)
        self.assertIsInstance(first_campus_step.end_location.lng, float)
        
        if len(campus_steps) > 1:
            second_campus_step = campus_steps[1]
            has_turn_or_continue = any(
                term in second_campus_step.instruction
                for term in ["Turn", "Continue", "Make a U-turn"]
            )
            self.assertTrue(has_turn_or_continue)
            self.assertIsNotNone(second_campus_step.end_location)

    def test_tts_endpoint(self) -> None:
        from src.routes.navigation import text_to_speech
        response = text_to_speech(text="Verify text-to-speech functionality.")
        self.assertEqual(response.media_type, "audio/mpeg")
        
        import asyncio
        async def read_chunks():
            chunks = []
            async for chunk in response.body_iterator:
                chunks.append(chunk)
                break
            return chunks
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            chunks = loop.run_until_complete(read_chunks())
        finally:
            loop.close()
        self.assertGreater(len(chunks), 0)
        self.assertGreater(len(chunks[0]), 0)


if __name__ == '__main__':
    unittest.main()
