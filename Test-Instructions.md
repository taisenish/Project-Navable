# Navable: Testing Guide and Simulation Instructions

**Author:** Dev Dhawan  
**Date:** May 2026  

This guide walks you through setting up Navable locally, executing our map data extraction script, and launching the mobile app simulation. Navable’s primary goal is **accessibility**: providing safe, reliable, and verified routes on campus for individuals with mobility challenges (like wheelchair users) where standard GPS platforms fail.

---

## 1. Setup and Map Data Extraction

Ensure you have **Node.js**, **Python 3.10+**, **Make**, and **Xcode** (for iOS simulator) installed on your Mac.

### Installation
Open your terminal in the root folder and run:
```bash
make setup
```
This sets up Python environments and installs the React Native frontend packages.

### Map Extraction (Local Data Pipeline)
To pull fresh pathway and accessibility feature coordinates from the university map API, run:
```bash
make map-extraction
```
* **Success**: The terminal logs "Extraction Complete!" and writes two clean files (`campus_edges.csv` and `uw_pois.json`) directly into the `backend/src/data/` folder.

---

## 2. Launching the App

We use a remote Azure development backend. To make testing seamless, we have automated the environment and Metro caching setup:

* **For the iOS Simulator (With Auto-Location Spoofing)**:
  ```bash
  make run-test-simulation-ios
  ```
  *This automatically connects the app to the Azure backend, clears Metro caches, and **spoofs the simulator's location to Mary Gates Hall on the UW Campus (`47.6549, -122.3080`)** so you are centered on campus immediately.*

* **For Physical Devices (With Actual GPS Location)**:
  ```bash
  make run-test-simulation-local
  ```
  *This sets up the remote Azure backend and starts Metro, but **does not spoof your location**. This lets you test the app's real-time navigation and GPS features using your phone's actual location.*

---

## 3. Quick Feature Checklist

Here is a simple, human-friendly checklist to verify that everything works:

1. **Wheelchair vs. Standard Routing**: 
   * *How to test*: Plan a route from *Suzzallo Library* to *Husky Union Building (HUB)*. Toggle between the **Wheelchair** and **Standard** profiles. 
   * *Pass*: The wheelchair route strictly avoids stairs and steep hills (slopes over 1.5%), while the standard route takes a shorter path utilizing stairs.
2. **Accessibility Feature Search**: 
   * *How to test*: Search for "Elevator" or tap the **Restrooms** filter.
   * *Pass*: Pins for accessible bathrooms, elevators, and ramps are pulled from `uw_pois.json` and map correctly.
3. **Emergency Alert Scraper**:
   * *How to test*: Trigger the background alert scraping daemon by running:
     ```bash
     make scrape
     ```
   * *Pass*: The logs show a successful fetch from `emergency.uw.edu` and sync cleanly with the local database.
4. **Community Reports**:
   * *How to test*: Tap "Report Obstacle", submit a custom hazard (like "Broken Elevator"), and verify it renders immediately as a warning icon on the map.
5. **Campus Boundary Routing**:
   * *How to test*: Plan an on-campus route (*Mary Gates Hall* to *Drumheller Fountain*) and compare it to an off-campus route (*Suzzallo Library* to *15th Ave NE*).
   * *Pass*: The app calculates detailed accessibility paths within campus boundaries, while displaying a clear notification when routing to off-campus areas.

---

## Troubleshooting and Workarounds

* **Simulator is in California**: By default, Xcode starts simulators in Cupertino. Running `make run-test-simulation-ios` completely resolves this by automatically spoofing your GPS coordinates to Mary Gates Hall on startup.
* **Network Request Failed**: If you see a network error on login, verify you have a working internet connection. The app is pre-configured to communicate with the remote Azure backend and will automatically fall back to it.
