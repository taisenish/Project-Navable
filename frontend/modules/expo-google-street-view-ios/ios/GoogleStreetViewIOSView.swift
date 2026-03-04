import CoreLocation
import ExpoModulesCore
import GoogleMaps

final class GoogleStreetViewIOSView: ExpoView {
  private let panoramaView = GMSPanoramaView(frame: .zero)

  private var latitude: CLLocationDegrees?
  private var longitude: CLLocationDegrees?
  private var zoom: CGFloat = 1
  private var bearing: CLLocationDirection = 0
  private var tilt: Double = 0

  private var didSetInitialCoordinate = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    addSubview(panoramaView)
    panoramaView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    panoramaView.frame = bounds

    panoramaView.isUserInteractionEnabled = true
    panoramaView.orientationGestures = true
    panoramaView.navigationGestures = true
    panoramaView.zoomGestures = true
    panoramaView.streetNamesHidden = false
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    panoramaView.frame = bounds
  }

  func setLatitude(_ value: CLLocationDegrees) {
    latitude = value
    updatePanoramaPositionIfNeeded()
  }

  func setLongitude(_ value: CLLocationDegrees) {
    longitude = value
    updatePanoramaPositionIfNeeded()
  }

  func setZoom(_ value: CGFloat) {
    zoom = value
    applyCamera()
  }

  func setBearing(_ value: CLLocationDirection) {
    bearing = value
    applyCamera()
  }

  func setTilt(_ value: Double) {
    tilt = value
    applyCamera()
  }

  func setPanningEnabled(_ value: Bool) {
    panoramaView.orientationGestures = value
  }

  func setStreetNamesEnabled(_ value: Bool) {
    panoramaView.streetNamesHidden = !value
  }

  func setUserNavigationEnabled(_ value: Bool) {
    panoramaView.navigationGestures = value
  }

  func setZoomGesturesEnabled(_ value: Bool) {
    panoramaView.zoomGestures = value
  }

  private func updatePanoramaPositionIfNeeded() {
    guard let latitude, let longitude else {
      return
    }

    let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    panoramaView.moveNearCoordinate(coordinate)

    if !didSetInitialCoordinate {
      didSetInitialCoordinate = true
      applyCamera()
    }
  }

  private func applyCamera() {
    let camera = GMSPanoramaCamera(
      heading: bearing,
      pitch: tilt,
      zoom: Float(zoom)
    )
    panoramaView.camera = camera
  }
}
