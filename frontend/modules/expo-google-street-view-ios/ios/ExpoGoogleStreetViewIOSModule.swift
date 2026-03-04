import ExpoModulesCore
import GoogleMaps

public class ExpoGoogleStreetViewIOSModule: Module {
  private static var didProvideAPIKey = false

  public func definition() -> ModuleDefinition {
    Name("ExpoGoogleStreetViewIOS")

    OnCreate {
      Self.provideGoogleMapsAPIKeyIfNeeded()
    }

    View(GoogleStreetViewIOSView.self) {
      Prop("latitude") { (view: GoogleStreetViewIOSView, value: Double) in
        view.setLatitude(value)
      }

      Prop("longitude") { (view: GoogleStreetViewIOSView, value: Double) in
        view.setLongitude(value)
      }

      Prop("zoom") { (view: GoogleStreetViewIOSView, value: Double?) in
        guard let value else { return }
        view.setZoom(CGFloat(value))
      }

      Prop("bearing") { (view: GoogleStreetViewIOSView, value: Double?) in
        guard let value else { return }
        view.setBearing(value)
      }

      Prop("tilt") { (view: GoogleStreetViewIOSView, value: Double?) in
        guard let value else { return }
        view.setTilt(value)
      }

      Prop("isPanningGesturesEnabled") { (view: GoogleStreetViewIOSView, value: Bool?) in
        view.setPanningEnabled(value ?? true)
      }

      Prop("isStreetNamesEnabled") { (view: GoogleStreetViewIOSView, value: Bool?) in
        view.setStreetNamesEnabled(value ?? true)
      }

      Prop("isUserNavigationEnabled") { (view: GoogleStreetViewIOSView, value: Bool?) in
        view.setUserNavigationEnabled(value ?? true)
      }

      Prop("isZoomGesturesEnabled") { (view: GoogleStreetViewIOSView, value: Bool?) in
        view.setZoomGesturesEnabled(value ?? true)
      }
    }
  }

  private static func provideGoogleMapsAPIKeyIfNeeded() {
    guard !didProvideAPIKey else {
      return
    }

    guard let apiKey = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String,
          !apiKey.isEmpty
    else {
      return
    }

    GMSServices.provideAPIKey(apiKey)
    didProvideAPIKey = true
  }
}
