PuriAir Frontend v2
===================

Role-based frontend prototype for the PuriAir IoT multi-classroom air quality analytics platform.

ACCESS ROLES
------------
ADMINISTRATOR
- PuriAir project information
- Overview / multi-classroom view
- Classroom live telemetry
- Automated purification feedback and manual override
- Add/remove classrooms from the dashboard
- Analytics and historical trends
- Alerts
- Recommendations
- Admin settings

STUDENT
- PuriAir project information
- Overview
- Classroom conditions (read-only)
- Analytics and historical trends
- Cannot access alerts, recommendations, settings, classroom management, or purifier controls

CLASSROOM VIEW
--------------
The Classroom tab prioritizes LIVE TELEMETRY.
Metrics shown in the primary classroom view:
- Humidity
- CO2
- PM2.5
- Temperature

CHI is displayed beside the SAFE / MODERATE / POOR / CRITICAL status label.
Classroom boxes use:
- Green = Safe
- Yellow = Moderate
- Orange = Poor
- Red = Critical

HISTORICAL TREND
----------------
Historical trend charts were moved from Classroom to Analytics.
Analytics supports:
- Humidity
- CO2
- PM2.5
- Temperature
- CHI
- Occupancy vs CO2 correlation
- 15-minute predictive outlook

BACKEND INTEGRATION
-------------------
This is still a frontend prototype. Replace the simulated telemetry and role gate with:
1. Firebase Authentication for real Admin/Student accounts and role claims.
2. Firebase Realtime Database/Firestore listeners for telemetry.
3. Firebase writes for purifier commands.
4. Persistent classroom management data.
5. Server-side authorization/security rules. Frontend hiding alone is NOT security.
