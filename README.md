# Space Defenders - 21st Century

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Phaser 3](https://img.shields.io/badge/Phaser%203-Game%20Engine-green.svg)](https://phaser.io/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Computer%20Vision-orange.svg)](https://developers.google.com/mediapipe)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-purple.svg)](https://vitejs.dev/)

**Space Defenders - 21st Century** is a technical demonstration of a **dual-perspective** arcade combat simulation controlled via **real-time computer vision**. It pushes the boundaries of web-based gaming by integrating robust hand-tracking with a high-performance rendering engine, creating a seamless "Minority Report" style interface for the browser.

---

## 🎮 Core Concept & Innovation

The game simulates a two-person crew operating a spacecraft, requiring the player to manage two distinct contexts simultaneously:

1.  **Strategic Command (Pilot)**: A top-down "Macro" view focusing on navigation, physics-based movement, and hull integrity.
2.  **Tactical Systems (Gunner)**: A first-person "Micro" view focusing on precision targeting, threat elimination, and shield management.

### Key Technical Achievements
-   **Hybrid Input System**: Prioritized blending of Gesture Recognition (MediaPipe) and Peripherals (Mouse/Keyboard).
-   **Signal Processing**: Implementation of a **1€ Filter (One Euro Filter)** to stabilize noisy CV input coordinates, ensuring 60 FPS smoothness.
-   **Dual-Scene Architecture**: Parallel execution of two Phaser Scenes (`Strategic` & `Tactical`) communicating via a centralized Event Bus.
-   **"Game Juice" Mechanics**: Advanced polished loops including magnetic aim-assist, lock hysteresis, and dynamic screen shake algorithms.

---

## 🏗 System Architecture

### 1. The Computer Vision Pipeline
We utilize **MediaPipe Hands** to infer 21 3D hand landmarks in real-time.
-   **Service Layer**: `HandTracker.ts` manages the camera stream and inference loop.
-   **Gesture Logic**: Raw landmarks are processed into semantic states ("Open Palm", "Closed Fist", "Index Point").
-   **Coordinate Mapping**: Screen space is split logically; the right hand controls the Strategic view, while the left hand controls the Tactical view.

### 2. The Input Priority Stack
To ensure accessibility and robustness, the input system uses a strict priority fallback:
1.  **Tier 1: Hand Tracking**: If a valid gesture (`IndexExtended`) is detected, it overrides all other inputs.
2.  **Tier 2: Peripherals**: If CV confidence drops or hands are removed:
    -   **Mouse** automatically takes over Gunner controls (Aim/Fire), but *only* within the Tactical viewport.
    -   **WASD/Arrows** engage "Manual Pilot" mode, switching the movement physics from Gesture-Lerp to High-Response Arcade physics.

### 3. Combat Mathematics
-   **Magnetic Auto-Aim**: A linear interpolation (`t=0.4`) pulls the crosshair towards valid targets within a defined radius, simulating a "soft lock".
-   **Lock Hysteresis**: To prevent aim jitter, the target selection algorithm is biased; a new target must be significantly closer (>20px) than the current target to trigger a switch.
-   **Bounds-Based Hit Detection**: Collision uses shrunk bounding boxes (70% of sprite size) rather than simple distance checks, allowing for precise "grazing" maneuvers.

---

## 🕹 Controls

| Role | Hand Gesture | Fallback Input | Action |
| :--- | :--- | :--- | :--- |
| **Pilot** | **Right Pan**: Move Ship<br>**Fist**: Boost Speed | **WASD / Arrows** | Navigation |
| **Gunner**| **Left Point**: Aim Crosshair<br>**Fitch (Q)**: Fire | **Mouse Move**: Aim<br>**L-Click**: Fire | Combat |

---

## 🚀 Installation & Development

This project uses **Vite** for lightning-fast HMR and building.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/sanjayBahadur/SPACE-DEFENDERS-21st-Century.git
    cd SpaceDefenders-21stCentury
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```
    *Open `http://localhost:5173` in your browser. Ensure webcam permissions are granted.*

---

## 📜 Version History / Changelog

| Version | Highlights & Changes |
| :--- | :--- |
| **v0.5.3** | **Gunner Experiece Improvements**: Added "Snap" animation for target locks, pulsing UI, and "Sticky" Lock Hysteresis.<br>Tuned Aim Assist for smoother feel. |
| **v0.5.2** | **Combat Refinement**: Implemented Magnetic Auto-Aim and tighter Hitbox bounds (70% scale) for precision Pilot maneuvering. |
| **v0.5.1** | **Fallback Systems**: Integrated Keyboard (Pilot) and Mouse (Gunner) controls with Priority Logic (Hand > Mouse).<br>Fixed input conflict bugs. |
| **v0.4.4** | **Boss Polish**: Refined Enemy V3 attack timings and visual FX.<br>Updated missile color coding (V1: Orange, V2: Cyan). |
| **v0.4.3** | **Hitbox Tuning**: Switched from radial checks to Bounds Intersection.<br>Added "Key Animation" phase to Boss fights. |
| **v0.4.2** | **Features**: Added Meteor directional logic, Black Holes, and Death Ray mechanics. |
| **v0.4.1** | **Assets**: Initial integration of high-fidelity sprites and background assets. |
| **v0.3.1** | **MVP (Pilot)**: Core movement and obstacle spawning implemented. |
| **v0.2.x** | **MVP (Gunner)**: Flick-to-shoot gestures, Hull Health, and basic UI. |
| **v0.1.x** | **Core**: Hand Tracking initialization, Coordinate Splitting, and 1€ Filter smoothing integration. |

---

*Developed by Sanjay Bahadur*
