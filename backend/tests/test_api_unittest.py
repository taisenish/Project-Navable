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


if __name__ == '__main__':
    unittest.main()
