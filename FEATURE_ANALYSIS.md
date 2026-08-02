# Feature Analysis - Jelajah Solo Technopark

This document summarizes the main features currently implemented in the project and explains why each feature was developed.

## 1. Landing Experience

### Feature
- A welcoming landing screen introduces the experience.
- Users can choose the language (Indonesia or English).
- Users select a product idea before starting the journey.

### Why this feature was developed
- To create a strong first impression for visitors.
- To make the experience feel guided and structured from the beginning.
- To personalize the experience by letting users choose an idea they want to explore.

---

## 2. Bilingual Interface

### Feature
- The interface supports both Indonesian and English content.
- Translations are applied across text such as labels, buttons, messages, and map information.

### Why this feature was developed
- To make the experience accessible to a wider audience.
- To support visitors from different backgrounds and improve usability.
- To make the app feel more professional and inclusive.

---

## 3. Idea Selection

### Feature
- Users can select a product idea from a list before entering the main experience.

### Why this feature was developed
- To connect the gamified journey to a clear innovation theme.
- To make the app more purposeful than just a simple tour.
- To let the user feel that they are building toward a specific creative outcome.

---

## 4. Interactive Map Exploration

### Feature
- The app displays an interactive map of the area.
- Users can zoom in and out, pan around, and explore the location.
- Checkpoints are shown on the map as interactive markers.

### Why this feature was developed
- To turn the physical location into a digital exploration experience.
- To make navigation intuitive and engaging for users.
- To encourage movement and discovery instead of passive browsing.

---

## 5. Checkpoint Marker System

### Feature
- Each checkpoint is represented visually on the map.
- The marker changes state depending on whether the checkpoint is scanned, restricted, or recently visited.

### Why this feature was developed
- To give immediate visual feedback to users.
- To help users understand progress and location status at a glance.
- To make the experience feel more game-like and rewarding.

---

## 6. Last Visited Highlight

### Feature
- The most recently visited checkpoint is visually highlighted.

### Why this feature was developed
- To reinforce the user’s current position or recent activity.
- To make navigation easier after a user has moved through the experience.
- To create a stronger sense of progression and continuity.

---

## 7. Restricted Area Handling

### Feature
- Restricted or off-limits areas are shown on the map without triggering a browser alert.
- The user receives a direct in-map indication instead.

### Why this feature was developed
- To keep the experience smooth and immersive.
- To avoid breaking the flow with disruptive browser popups.
- To make the map communicate boundaries clearly and elegantly.

---

## 8. QR Code Scanning

### Feature
- Users can scan QR codes at checkpoints using the device camera.
- The app validates the scanned QR and links it to the correct checkpoint.

### Why this feature was developed
- To connect the digital experience with real-world location discovery.
- To make the journey interactive and location-based.
- To give the game structure and physical-world relevance.

---

## 9. Manual QR Input Fallback

### Feature
- If camera scanning is not available or fails, users can enter a manual code.

### Why this feature was developed
- To improve reliability and reduce user frustration.
- To ensure the experience still works even when device camera support is limited.
- To make the app more robust in different environments.

---

## 10. Secret Card Unlock Flow

### Feature
- The card remains hidden until the user reaches the location and completes the checkpoint scan.
- After scanning, the user enters a teaser and then the reveal stage.

### Why this feature was developed
- To preserve suspense and excitement.
- To make the experience feel like a discovery-based quest.
- To tie reward collection directly to real-world progress.

---

## 11. Card Reveal Experience

### Feature
- Once a checkpoint is completed, a card is revealed to the user.
- The card is displayed in a portrait-style visual layout.

### Why this feature was developed
- To make the reward feel special and memorable.
- To strengthen the gamification element of the app.
- To create a clear moment of accomplishment after each checkpoint.

---

## 12. Inventory / Card Collection System

### Feature
- Users can view all collected cards in an inventory screen.
- Each card can be selected to see more detail.
- A button lets users return to the map from the inventory view.

### Why this feature was developed
- To give users a place to revisit their achievements.
- To make collected items feel organized and meaningful.
- To support the progression loop of discover, collect, and reflect.

---

## 13. Card Detail View

### Feature
- When a card is selected, a detail view appears showing the card image and its related description.

### Why this feature was developed
- To deepen the user experience beyond simple collection.
- To provide context and storytelling around each discovered item.
- To make the content feel richer and more educational.

---

## 14. Blueprint / Innovation Summary

### Feature
- The app presents a blueprint view summarizing the collected cards and scoring them.
- The score includes base points plus bonus points based on matching tags to the selected idea.

### Why this feature was developed
- To give users a sense of completion and result at the end of the journey.
- To connect the collected cards to the chosen innovation idea.
- To make the game feel more strategic and rewarding.

---

## 15. Progress Persistence

### Feature
- User progress is stored in local storage.
- Data such as selected idea, scanned checkpoints, collected cards, and last visited checkpoint are saved automatically.

### Why this feature was developed
- To prevent users from losing their progress when refreshing or revisiting the app.
- To create a smoother, more dependable experience.
- To support the app as a mobile-friendly interactive experience.

---

## 16. Offline-Friendly Statistics Queue

### Feature
- Activity data is queued locally and sent to Supabase when the user is online.

### Why this feature was developed
- To make the app more resilient when the connection is unstable.
- To preserve visitor analytics even during temporary network issues.
- To reduce the chance of data loss during real-world usage.

---

## 17. Supabase Data Integration

### Feature
- The app fetches game data, ideas, checkpoints, and cards from Supabase.
- A local snapshot is used as a fallback when live data is unavailable.

### Why this feature was developed
- To make the content dynamic and easy to update remotely.
- To separate content management from app code.
- To reduce the need for frequent app redeploys when content changes.

---

## 18. Admin Content Management

### Feature
- An admin page allows authorized users to log in and edit checkpoint content such as names, teaser text, reveal text, and access status.

### Why this feature was developed
- To make content updates practical for non-developers.
- To allow operators to manage the experience without changing code.
- To support future maintenance and content flexibility.

---

## 19. Visual Design and UX Polish

### Feature
- The app uses a modern visual style with rounded cards, blur effects, overlays, and animated transitions.
- The interface is designed to feel polished and mobile-friendly.

### Why this feature was developed
- To make the experience feel premium and engaging.
- To fit the nature of a modern interactive event or educational showcase.
- To improve the overall impression and user satisfaction.

---

## Overall Purpose of the Project

The implemented features work together to create a mobile-friendly, location-based, gamified exploration experience. The project is designed to:

- turn a physical location into an interactive adventure,
- encourage discovery and movement,
- reward users with collectible content,
- and provide a flexible content system that can be managed over time.
