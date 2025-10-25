# IoT Item Reminder - Diagram Index

This document provides quick reference to all diagrams included in the project documentation.

## Architecture Diagrams

### C4 Container Level (C2) Diagram
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md#c4-model---container-level-c2)

Shows all system containers and their interactions:
- ESP32 Device
- MQTT Broker (Mosquitto)
- Backend API Server (Node.js)
- MongoDB Database
- Web Browser (React Frontend)
- Nginx Reverse Proxy
- External Services (Blynk, Firebase)

**Purpose**: Understand the high-level system architecture and how containers communicate.

---

### Software Block Diagram
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md#software-block-diagram)

Layered architecture view:
- **Presentation Layer**: Dashboard, Items, Analytics, Geofences, Alerts pages
- **Application Layer**: Routes and Business Logic Services
- **Data Layer**: Models and Database
- **Edge Layer**: ESP32 Firmware

**Purpose**: Understand the layered software architecture and component organization.

---

### Simplified Architecture Diagram
**Location**: [README.md](../README.md#architecture)

Quick system overview showing:
- Data flow from ESP32 to Frontend
- Communication protocols (MQTT, HTTP/WSS)
- Real-time notification paths
- Component relationships

**Purpose**: Quick onboarding and high-level understanding.

---

## Data Model Diagrams

### UML Class Diagram
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md#uml-class-diagram---core-data-models)

Complete data model showing:
- **User**: Authentication and user management
- **Item**: Tracked items with device association
- **Reading**: Time-series weight measurements
- **Geofence**: Location-based zones
- **Alert**: Notifications and warnings

Includes:
- All fields with data types
- Relationships (1-to-many)
- Key methods
- Database indexes

**Purpose**: Understand database schema and entity relationships.

---

## Sequence Diagrams

### 1. Weight Measurement and Alert Flow
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md#1-weight-measurement-and-alert-flow)

Shows the complete flow:
1. ESP32 measures weight
2. Publishes to MQTT
3. Backend processes data
4. Database updates
5. Alert creation
6. Notification sending
7. Real-time frontend update

**Purpose**: Understand the core data flow from sensor to user interface.

---

### 2. User Authentication Flow
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md#2-user-authentication-flow)

Shows authentication process:
1. User registration with password hashing
2. User login with JWT generation
3. Protected API requests with token verification

**Purpose**: Understand security and authentication mechanisms.

---

### 3. Geofence Check Flow
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md#3-geofence-check-flow)

Shows geofencing logic:
1. User location submission
2. Distance calculation
3. Zone boundary checking
4. Conditional alert creation
5. Notification triggering

**Purpose**: Understand location-based alerting system.

---

## Feature Diagrams

### Feature Architecture Map
**Location**: [FEATURES.md](FEATURES.md#feature-architecture-map)

High-level feature ecosystem showing:
- **Monitoring**: Real-time tracking
- **Alerting**: Multi-channel notifications
- **Analytics**: Historical trends
- **Geofencing**: Location zones
- **User Management**: Authentication & authorization
- **Supporting Features**: Security, real-time, scalability

**Purpose**: Understand feature organization and relationships.

---

### Technology Stack Diagram
**Location**: [FEATURES.md](FEATURES.md#technology-stack-summary)

Complete technology stack across layers:
- **Edge Layer**: ESP32 (C++, Arduino)
- **Frontend Layer**: React, Material-UI, Recharts, Leaflet
- **Backend Layer**: Node.js, Express, MQTT.js, Socket.IO
- **Data Layer**: MongoDB
- **Messaging Layer**: Eclipse Mosquitto
- **Infrastructure Layer**: Docker, Nginx
- **External Services**: Blynk, Firebase, SMTP

**Purpose**: Understand all technologies used in the project.

---

## Deployment Diagrams

### Deployment Scenarios
**Location**: [DEPLOYMENT.md](DEPLOYMENT.md#deployment-architecture-overview)

Shows three deployment options:
1. **Local Development**: Manual setup with multiple terminals
2. **Docker Deployment**: One-command container orchestration
3. **Cloud Hosting**: Production deployment on AWS/DO/Azure

**Purpose**: Choose appropriate deployment strategy.

---

### Production Architecture
**Location**: [DEPLOYMENT.md](DEPLOYMENT.md#deployment-architecture-overview)

Production-grade setup:
- Nginx reverse proxy with SSL/TLS
- Multiple backend instances for load balancing
- MongoDB replica set
- MQTT cluster

**Purpose**: Understand production scaling and high availability.

---

### Docker Architecture
**Location**: [DEPLOYMENT.md](DEPLOYMENT.md#docker-architecture)

Docker Compose network topology:
- 4 containers (frontend, backend, mongodb, mosquitto)
- Internal networks (backend, frontend)
- Persistent volumes
- Port mappings
- Service dependencies

**Purpose**: Understand containerized deployment.

---

## Hardware Diagrams

### ESP32 Device Architecture
**Location**: [esp32/README.md](../esp32/README.md#system-architecture)

ESP32 firmware components:
- Main loop
- WiFi manager
- MQTT client
- Sensor simulator/driver

**Purpose**: Understand ESP32 firmware structure.

---

### Data Flow (Sensor to MQTT)
**Location**: [esp32/README.md](../esp32/README.md#data-flow-diagram)

Hardware data flow:
1. Sensor analog signal
2. ADC conversion
3. ESP32 processing
4. JSON formatting
5. MQTT publishing

**Purpose**: Understand sensor data pipeline.

---

### Hardware Wiring Diagrams
**Location**: [esp32/README.md](../esp32/README.md#hardware-connections)

Two configurations:
1. **Simulation Mode**: Current implementation using ADC GPIO 34
2. **Production Mode**: HX711 load cell wiring with complete pin mappings

**Purpose**: Set up physical hardware connections.

---

## Quick Start Diagrams

### System Quick View
**Location**: [QUICKSTART.md](QUICKSTART.md#system-quick-view)

Simplified architecture for quick understanding:
- ESP32 Device → MQTT
- Backend Services (MongoDB, Mosquitto, Node.js)
- Web Browser → User Interface
- Real-time notifications

**Purpose**: Quick onboarding for new users.

---

### User Journey Map
**Location**: [QUICKSTART.md](QUICKSTART.md#user-journey-map)

Step-by-step user flow:
1. Register Account
2. Add Item
3. Configure ESP32
4. Set Up Geofence
5. Monitor

**Purpose**: Guide users through initial setup.

---

## Status and Metrics Diagrams

### Project Status Map
**Location**: [SUMMARY.md](../SUMMARY.md#project-status-map)

Implementation status dashboard:
- Component completion status (✅ 100%)
- Documentation coverage
- Feature integration status

**Purpose**: Track project completion and documentation coverage.

---

### Code Statistics
**Location**: [SUMMARY.md](../SUMMARY.md#project-metrics)

Detailed metrics:
- File counts by type
- Lines of code by component
- Dependencies breakdown
- Component structure

**Purpose**: Understand project size and complexity.

---

## Diagram Legend

### Symbols Used

```
┌──────┐
│ Box  │  - Component, Container, or Module
└──────┘

   │
   ▼      - Data flow or dependency direction
   
───▶      - Synchronous communication (HTTP, function call)
   
═══▶      - Emphasized connection
   
   │
   ├──    - Branching or multiple connections
   │
   
[ref:X]   - Reference to another entity

• Bullet  - List item or feature

✅        - Complete/Implemented
```

### Communication Protocols

- **MQTT**: Lightweight pub/sub messaging
- **HTTP/HTTPS**: RESTful API communication
- **WebSocket (WSS)**: Real-time bidirectional communication
- **Socket.IO**: Enhanced WebSocket with fallbacks

### Container Types

- **[Container]**: Generic containerized service
- **[Container: Node.js]**: Specific technology container
- **[Container: JS]**: JavaScript application
- **[External Systems]**: Third-party services

---

## How to Use These Diagrams

### For Developers
1. Start with **Simplified Architecture Diagram** (README.md)
2. Dive into **C4 Container Diagram** for system understanding
3. Review **UML Class Diagram** for data model
4. Check **Sequence Diagrams** for implementation details

### For DevOps/Deployment
1. Review **Deployment Scenarios** diagram
2. Study **Docker Architecture** for containerization
3. Check **Production Architecture** for scaling

### For Hardware Engineers
1. Review **ESP32 Device Architecture**
2. Check **Hardware Wiring Diagrams**
3. Understand **Data Flow** from sensor to cloud

### For Project Managers
1. Check **Project Status Map**
2. Review **Feature Architecture Map**
3. Study **User Journey Map**

---

## Diagram Formats

All diagrams in this project use **ASCII art** format for:
- ✅ Version control friendly (text-based)
- ✅ Easy to edit and update
- ✅ Readable in any text editor or terminal
- ✅ No external tool dependencies
- ✅ Renders well in Markdown

---

## Contributing to Diagrams

When updating diagrams:
1. Maintain consistent box drawing characters
2. Keep alignment and spacing uniform
3. Update this index when adding new diagrams
4. Test rendering in GitHub Markdown preview
5. Keep diagrams simple and focused

---

## Diagram Tools

If you prefer to create diagrams with tools and export to ASCII:
- **Monodraw** (macOS): Native ASCII diagram tool
- **ASCIIFlow**: Web-based ASCII diagram tool
- **draw.io**: Can export to text format
- **PlantUML**: Code-based diagram generation

However, all diagrams in this project were hand-crafted for maximum clarity and customization.

---

**Last Updated**: 2024
**Maintainer**: Project Documentation Team
