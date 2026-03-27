# Key Features

<cite>
**Referenced Files in This Document**
- [main.py](file://main.py)
- [models.py](file://models.py)
- [schemas.py](file://schemas.py)
- [database.py](file://database.py)
- [routes/auth.py](file://routes/auth.py)
- [routes/events.py](file://routes/events.py)
- [routes/participants.py](file://routes/participants.py)
- [routes/scores.py](file://routes/scores.py)
- [routes/templates.py](file://routes/templates.py)
- [routes/users.py](file://routes/users.py)
- [utils/security.py](file://utils/security.py)
- [utils/dependencies.py](file://utils/dependencies.py)
- [frontend/src/App.tsx](file://frontend/src/App.tsx)
- [frontend/src/contexts/AuthContext.tsx](file://frontend/src/contexts/AuthContext.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/pages/admin/AdminHome.tsx](file://frontend/src/pages/admin/AdminHome.tsx)
- [frontend/src/pages/admin/Eventos.tsx](file://frontend/src/pages/admin/Eventos.tsx)
- [frontend/src/pages/admin/Participantes.tsx](file://frontend/src/pages/admin/Participantes.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the core features of the Juzgamiento system for managing car audio and tuning competitions. It covers:
- Administrator dashboard: user management, event lifecycle, template builder, and participant import via Excel
- Judge interface: participant selection, real-time scoring with dynamic templates, score submission, and evaluation history
- Underlying systems: JWT authentication, role-based access control, real-time score calculation, template validation, and data import/export
- Practical workflows: competition setup, participant registration, and evaluation processes

## Project Structure
The system is organized into a FastAPI backend with SQLAlchemy ORM and a React/TypeScript frontend. The backend exposes REST endpoints grouped by domain (auth, events, participants, scores, templates, users). The frontend routes users by role and integrates with the backend via an API client.

```mermaid
graph TB
subgraph "Backend"
A_main["main.py<br/>FastAPI app, routers, CORS"]
A_models["models.py<br/>ORM entities"]
A_schemas["schemas.py<br/>Pydantic models"]
A_db["database.py<br/>SQLite engine, migrations"]
A_auth["routes/auth.py<br/>/api/login"]
A_events["routes/events.py<br/>/api/events"]
A_participants["routes/participants.py<br/>/api/participants"]
A_scores["routes/scores.py<br/>/api/scores"]
A_templates["routes/templates.py<br/>/api/templates"]
A_users["routes/users.py<br/>/api/users"]
A_security["utils/security.py<br/>JWT, hashing"]
A_deps["utils/dependencies.py<br/>RBAC, token parsing"]
end
subgraph "Frontend"
F_App["frontend/src/App.tsx<br/>Routing by role"]
F_AuthCtx["frontend/src/contexts/AuthContext.tsx<br/>Auth state & token parsing"]
F_API["frontend/src/lib/api.ts<br/>Axios client"]
F_AdminHome["frontend/src/pages/admin/AdminHome.tsx"]
F_Eventos["frontend/src/pages/admin/Eventos.tsx"]
F_Participantes["frontend/src/pages/admin/Participantes.tsx"]
end
F_App --> F_AuthCtx
F_App --> F_Eventos
F_App --> F_Participantes
F_AuthCtx --> F_API
F_Eventos --> F_API
F_Participantes --> F_API
A_main --> A_auth
A_main --> A_events
A_main --> A_participants
A_main --> A_scores
A_main --> A_templates
A_main --> A_users
A_auth --> A_security
A_auth --> A_deps
A_events --> A_deps
A_participants --> A_deps
A_scores --> A_deps
A_templates --> A_deps
A_users --> A_deps
A_events --> A_models
A_participants --> A_models
A_scores --> A_models
A_templates --> A_models
A_users --> A_models
A_models --> A_db
A_schemas --> A_models
```

**Diagram sources**
- [main.py:1-38](file://main.py#L1-L38)
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:1-152](file://schemas.py#L1-L152)
- [database.py:1-93](file://database.py#L1-L93)
- [routes/auth.py:1-36](file://routes/auth.py#L1-L36)
- [routes/events.py:1-74](file://routes/events.py#L1-L74)
- [routes/participants.py:1-400](file://routes/participants.py#L1-L400)
- [routes/scores.py:1-132](file://routes/scores.py#L1-L132)
- [routes/templates.py:1-64](file://routes/templates.py#L1-L64)
- [routes/users.py:1-192](file://routes/users.py#L1-L192)
- [utils/security.py:1-51](file://utils/security.py#L1-L51)
- [utils/dependencies.py:1-71](file://utils/dependencies.py#L1-L71)
- [frontend/src/App.tsx:1-119](file://frontend/src/App.tsx#L1-L119)
- [frontend/src/contexts/AuthContext.tsx:1-144](file://frontend/src/contexts/AuthContext.tsx#L1-L144)
- [frontend/src/lib/api.ts:1-33](file://frontend/src/lib/api.ts#L1-L33)
- [frontend/src/pages/admin/AdminHome.tsx:1-49](file://frontend/src/pages/admin/AdminHome.tsx#L1-L49)
- [frontend/src/pages/admin/Eventos.tsx:1-409](file://frontend/src/pages/admin/Eventos.tsx#L1-L409)
- [frontend/src/pages/admin/Participantes.tsx:1-693](file://frontend/src/pages/admin/Participantes.tsx#L1-L693)

**Section sources**
- [main.py:1-38](file://main.py#L1-L38)
- [frontend/src/App.tsx:1-119](file://frontend/src/App.tsx#L1-L119)

## Core Components
- Authentication and roles
  - JWT-based login endpoint returns access tokens with role claims
  - Frontend stores tokens and parses user_id from JWT payload
  - Backend enforces role-based access for protected routes
- Data model
  - Users, Events, Participants, FormTemplates, Scores
  - Unique constraints and foreign keys define relationships
- Import/export pipeline
  - Excel upload with flexible column normalization and validation
  - Bulk insert with conflict detection per event
- Scoring engine
  - Dynamic template validation against participant modalidad/categoría
  - Recursive numeric aggregation for totals

**Section sources**
- [routes/auth.py:13-36](file://routes/auth.py#L13-L36)
- [utils/security.py:29-39](file://utils/security.py#L29-L39)
- [frontend/src/contexts/AuthContext.tsx:43-63](file://frontend/src/contexts/AuthContext.tsx#L43-L63)
- [utils/dependencies.py:32-47](file://utils/dependencies.py#L32-L47)
- [models.py:11-95](file://models.py#L11-L95)
- [routes/participants.py:286-400](file://routes/participants.py#L286-L400)
- [routes/scores.py:43-132](file://routes/scores.py#L43-L132)

## Architecture Overview
The system follows a layered architecture:
- Presentation layer: React SPA with role-based routing
- Application layer: FastAPI routers implementing domain logic
- Domain services: Pydantic schemas for validation, SQLAlchemy ORM for persistence
- Infrastructure: SQLite engine and runtime migrations

```mermaid
graph TB
Client["Browser"]
Router["React Router<br/>App.tsx"]
AuthCtx["AuthContext<br/>parse JWT payload"]
API["Axios Client<br/>api.ts"]
BE["FastAPI App<br/>main.py"]
Auth["/api/login<br/>auth.py"]
Events["/api/events/*<br/>events.py"]
Participants["/api/participants/*<br/>participants.py"]
Scores["/api/scores/*<br/>scores.py"]
Templates["/api/templates/*<br/>templates.py"]
Users["/api/users/*<br/>users.py"]
Sec["security.py<br/>JWT, hashing"]
Deps["dependencies.py<br/>RBAC, token parsing"]
DB["database.py<br/>SQLite engine"]
Models["models.py<br/>ORM"]
Client --> Router --> AuthCtx --> API --> BE
BE --> Auth
BE --> Events
BE --> Participants
BE --> Scores
BE --> Templates
BE --> Users
Auth --> Sec
Auth --> Deps
Events --> Deps
Participants --> Deps
Scores --> Deps
Templates --> Deps
Users --> Deps
Events --> Models
Participants --> Models
Scores --> Models
Templates --> Models
Users --> Models
Models --> DB
```

**Diagram sources**
- [frontend/src/App.tsx:91-119](file://frontend/src/App.tsx#L91-L119)
- [frontend/src/contexts/AuthContext.tsx:66-132](file://frontend/src/contexts/AuthContext.tsx#L66-L132)
- [frontend/src/lib/api.ts:11-13](file://frontend/src/lib/api.ts#L11-L13)
- [main.py:17-38](file://main.py#L17-L38)
- [routes/auth.py:13-36](file://routes/auth.py#L13-L36)
- [routes/events.py:13-74](file://routes/events.py#L13-L74)
- [routes/participants.py:286-400](file://routes/participants.py#L286-L400)
- [routes/scores.py:43-132](file://routes/scores.py#L43-L132)
- [routes/templates.py:13-64](file://routes/templates.py#L13-L64)
- [routes/users.py:21-192](file://routes/users.py#L21-L192)
- [utils/security.py:17-50](file://utils/security.py#L17-L50)
- [utils/dependencies.py:16-71](file://utils/dependencies.py#L16-L71)
- [database.py:20-34](file://database.py#L20-L34)
- [models.py:11-95](file://models.py#L11-L95)

## Detailed Component Analysis

### Administrator Dashboard
- Event management
  - List, create, and toggle active state of events
  - Admin-only endpoints enforce role checks
- User management
  - Create users, assign roles, manage permissions (including edit-score capability)
  - First user must be admin; subsequent creations require admin role
- Template builder
  - Save or update form templates keyed by modalidad and categoria
  - Retrieve templates for a given modalidad/categoria pair
- Participant import via Excel
  - Upload .xlsx files with flexible column names
  - Normalize headers, validate required fields, detect duplicates per event, bulk insert created records

```mermaid
sequenceDiagram
participant Admin as "Admin UI<br/>Eventos.tsx"
participant API as "API Client<br/>api.ts"
participant Router as "FastAPI Router<br/>events.py"
participant DB as "Database<br/>database.py/models.py"
Admin->>API : GET /api/events
API->>Router : GET /api/events
Router->>DB : query(Event).order_by(...)
DB-->>Router : list[Event]
Router-->>API : 200 OK
API-->>Admin : events
Admin->>API : POST /api/events {nombre, fecha, is_active}
API->>Router : POST /api/events
Router->>DB : add(Event), commit(), refresh(Event)
DB-->>Router : Event
Router-->>API : 201 Created
API-->>Admin : Event
```

**Diagram sources**
- [frontend/src/pages/admin/Eventos.tsx:62-73](file://frontend/src/pages/admin/Eventos.tsx#L62-L73)
- [routes/events.py:13-36](file://routes/events.py#L13-L36)
- [database.py:28-34](file://database.py#L28-L34)
- [models.py:23-32](file://models.py#L23-L32)

```mermaid
sequenceDiagram
participant Admin as "Admin UI<br/>Participantes.tsx"
participant API as "API Client<br/>api.ts"
participant Router as "FastAPI Router<br/>participants.py"
participant DB as "Database<br/>database.py/models.py"
Admin->>API : POST /api/participants/upload<br/>FormData(file, evento_id)
API->>Router : POST /api/participants/upload
Router->>DB : ensure_event_exists(evento_id)
Router->>Router : resolve_excel_columns(columns)
Router->>DB : query(existing placa_rodaje)
Router->>DB : bulk_save_objects(created_items)
Router->>DB : commit()
DB-->>Router : inserted records
Router-->>API : 201 Created {created_count, skipped_count, created_items, skipped_items}
API-->>Admin : Upload summary
```

**Diagram sources**
- [frontend/src/pages/admin/Participantes.tsx:169-187](file://frontend/src/pages/admin/Participantes.tsx#L169-L187)
- [routes/participants.py:286-400](file://routes/participants.py#L286-L400)
- [database.py:28-34](file://database.py#L28-L34)
- [models.py:34-63](file://models.py#L34-L63)

**Section sources**
- [routes/events.py:13-74](file://routes/events.py#L13-L74)
- [frontend/src/pages/admin/Eventos.tsx:28-196](file://frontend/src/pages/admin/Eventos.tsx#L28-L196)
- [routes/users.py:21-86](file://routes/users.py#L21-L86)
- [routes/templates.py:13-64](file://routes/templates.py#L13-L64)
- [routes/participants.py:286-400](file://routes/participants.py#L286-L400)
- [frontend/src/pages/admin/Participantes.tsx:142-187](file://frontend/src/pages/admin/Participantes.tsx#L142-L187)

### Judge Interface
- Participant selection
  - Judge views available participants filtered by active event
- Real-time scoring with dynamic templates
  - Fetch template matching participant’s modalidad and categoria
  - Submit score payload; backend validates template compatibility and computes numeric totals recursively
- Score submission and history
  - Create or update score; editors can modify existing submissions only if permitted
  - View all scores with optional filtering by judge

```mermaid
sequenceDiagram
participant Judge as "Judge UI<br/>Selector.tsx / Calificar.tsx"
participant API as "API Client<br/>api.ts"
participant Scores as "Scores Router<br/>scores.py"
participant Templates as "Templates Router<br/>templates.py"
participant DB as "Database<br/>database.py/models.py"
Judge->>API : GET /api/templates/{modalidad}/{categoria}
API->>Templates : GET /api/templates/{modalidad}/{categoria}
Templates->>DB : query(FormTemplate)
DB-->>Templates : FormTemplate
Templates-->>API : TemplateResponse
API-->>Judge : Template
Judge->>API : POST /api/scores {participante_id, template_id, datos_calificacion}
API->>Scores : POST /api/scores
Scores->>DB : query(Participant, FormTemplate)
Scores->>Scores : validate modalidad/categoria match
Scores->>Scores : sum_numeric_values(datos_calificacion)
Scores->>DB : upsert Score, commit()
DB-->>Scores : persisted Score
Scores-->>API : ScoreResponse
API-->>Judge : ScoreResponse
```

**Diagram sources**
- [routes/scores.py:43-115](file://routes/scores.py#L43-L115)
- [routes/templates.py:43-64](file://routes/templates.py#L43-L64)
- [database.py:28-34](file://database.py#L28-L34)
- [models.py:79-95](file://models.py#L79-L95)

**Section sources**
- [routes/scores.py:43-132](file://routes/scores.py#L43-L132)
- [routes/templates.py:13-64](file://routes/templates.py#L13-L64)
- [frontend/src/pages/admin/Participantes.tsx:120-140](file://frontend/src/pages/admin/Participantes.tsx#L120-L140)

### Authentication and Role-Based Access Control
- JWT authentication
  - Login endpoint verifies credentials and issues signed tokens with role and user_id claims
  - Token decoding extracts claims for downstream authorization
- RBAC enforcement
  - Guards for admin-only and judge-only endpoints
  - Optional current user retrieval for public endpoints
- Frontend integration
  - Stores token and user info in local storage
  - Parses user_id from JWT payload without external libraries

```mermaid
sequenceDiagram
participant Client as "Browser"
participant AuthUI as "Login Page"
participant API as "Axios Client"
participant Auth as "Auth Router<br/>auth.py"
participant Sec as "Security<br/>security.py"
participant Deps as "Dependencies<br/>dependencies.py"
participant DB as "Database"
Client->>AuthUI : submit credentials
AuthUI->>API : POST /api/login
API->>Auth : POST /api/login
Auth->>DB : query(User)
Auth->>Sec : verify_password()
Auth->>Sec : create_access_token({sub,user_id,role})
Sec-->>Auth : access_token
Auth-->>API : TokenResponse
API-->>AuthUI : {access_token, role, username}
AuthUI->>Client : persist token in localStorage
```

**Diagram sources**
- [routes/auth.py:13-36](file://routes/auth.py#L13-L36)
- [utils/security.py:17-39](file://utils/security.py#L17-L39)
- [utils/dependencies.py:50-71](file://utils/dependencies.py#L50-L71)
- [frontend/src/contexts/AuthContext.tsx:95-111](file://frontend/src/contexts/AuthContext.tsx#L95-L111)

**Section sources**
- [routes/auth.py:13-36](file://routes/auth.py#L13-L36)
- [utils/security.py:17-39](file://utils/security.py#L17-L39)
- [utils/dependencies.py:32-47](file://utils/dependencies.py#L32-L47)
- [frontend/src/contexts/AuthContext.tsx:66-111](file://frontend/src/contexts/AuthContext.tsx#L66-L111)

### Scoring System Architecture and Validation
- Template validation
  - Each score references a FormTemplate; backend ensures modalidad and categoria match the participant
- Real-time score calculation
  - Recursive numeric aggregation handles nested dicts/lists
- Edit permissions
  - Judges can edit existing scores only if granted explicit permission

```mermaid
flowchart TD
Start(["Submit Score Payload"]) --> LoadParticipant["Load Participant by ID"]
LoadParticipant --> LoadTemplate["Load Template by ID"]
LoadTemplate --> ValidateMatch{"Modalidad/Categoria match?"}
ValidateMatch --> |No| Error["HTTP 400 Bad Request"]
ValidateMatch --> |Yes| Compute["sum_numeric_values(datos_calificacion)"]
Compute --> Upsert["Upsert Score record"]
Upsert --> LoadScore["Refresh related entities"]
LoadScore --> BuildResponse["Build ScoreResponse"]
BuildResponse --> End(["Return ScoreResponse"])
Error --> End
```

**Diagram sources**
- [routes/scores.py:49-115](file://routes/scores.py#L49-L115)
- [routes/scores.py:16-26](file://routes/scores.py#L16-L26)
- [models.py:79-95](file://models.py#L79-L95)

**Section sources**
- [routes/scores.py:43-132](file://routes/scores.py#L43-L132)
- [models.py:65-77](file://models.py#L65-L77)

### Data Import/Export Capabilities
- Import
  - Excel upload endpoint normalizes headers, validates required fields, detects duplicates per event, and bulk inserts
- Export
  - Frontend lists participants and displays counts after upload; no dedicated export endpoint is present in the backend

**Section sources**
- [routes/participants.py:286-400](file://routes/participants.py#L286-L400)
- [frontend/src/pages/admin/Participantes.tsx:169-187](file://frontend/src/pages/admin/Participantes.tsx#L169-L187)

### Common Use Cases and Workflows
- Competition setup
  - Admin creates an event, sets active state, and configures templates per modalidad/categoria
- Participant registration
  - Admin imports participants via Excel or adds manually; assigns modalidad and categoria combinations
- Evaluation process
  - Judge selects a participant, loads the matching template, fills out criteria, submits score; history is visible

```mermaid
sequenceDiagram
participant Admin as "Admin"
participant Judge as "Judge"
participant API as "API"
participant DB as "Database"
Admin->>API : POST /api/events
Admin->>API : POST /api/templates
Admin->>API : POST /api/participants (bulk or manual)
Judge->>API : GET /api/participants?evento_id=...
Judge->>API : GET /api/templates/{modalidad}/{categoria}
Judge->>API : POST /api/scores
Judge->>API : GET /api/scores
API->>DB : ORM operations
DB-->>API : persisted data
API-->>Judge : results
```

**Diagram sources**
- [routes/events.py:21-36](file://routes/events.py#L21-L36)
- [routes/templates.py:13-41](file://routes/templates.py#L13-L41)
- [routes/participants.py:181-231](file://routes/participants.py#L181-L231)
- [routes/scores.py:117-132](file://routes/scores.py#L117-L132)

## Dependency Analysis
- Backend dependencies
  - FastAPI app aggregates routers and middleware
  - SQLAlchemy models define relationships and constraints
  - Security utilities centralize JWT and password hashing
  - Dependencies module centralizes RBAC and token parsing
- Frontend dependencies
  - Routing depends on AuthContext for role-aware navigation
  - API client encapsulates base URL and error handling

```mermaid
graph LR
App["main.py"] --> Routers["Routers"]
Routers --> Models["models.py"]
Routers --> Schemas["schemas.py"]
Routers --> Security["utils/security.py"]
Routers --> Deps["utils/dependencies.py"]
Models --> DB["database.py"]
Frontend["frontend/src/App.tsx"] --> AuthCtx["AuthContext.tsx"]
AuthCtx --> API["api.ts"]
API --> Routers
```

**Diagram sources**
- [main.py:17-38](file://main.py#L17-L38)
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:1-152](file://schemas.py#L1-152)
- [utils/security.py:17-50](file://utils/security.py#L17-L50)
- [utils/dependencies.py:16-71](file://utils/dependencies.py#L16-L71)
- [database.py:20-34](file://database.py#L20-L34)
- [frontend/src/App.tsx:91-119](file://frontend/src/App.tsx#L91-L119)
- [frontend/src/contexts/AuthContext.tsx:66-132](file://frontend/src/contexts/AuthContext.tsx#L66-L132)
- [frontend/src/lib/api.ts:11-13](file://frontend/src/lib/api.ts#L11-L13)

**Section sources**
- [main.py:17-38](file://main.py#L17-L38)
- [utils/dependencies.py:16-71](file://utils/dependencies.py#L16-L71)
- [frontend/src/App.tsx:91-119](file://frontend/src/App.tsx#L91-L119)

## Performance Considerations
- Database
  - SQLite engine configured for single-threaded reads/writes; consider connection pooling and indexing for scale
  - Migrations add columns and backfill legacy fields to maintain compatibility
- API
  - Bulk insert for participant uploads reduces round-trips
  - Joined loading for score responses avoids N+1 queries
- Frontend
  - Local storage caching of tokens avoids repeated logins
  - Debounce or batch updates for large participant lists

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication failures
  - Verify token presence and validity; check token expiration and secret key configuration
- Authorization errors
  - Ensure user role matches endpoint requirements; admin-only vs judge-only routes
- Import issues
  - Confirm Excel file format (.xlsx), required columns, and unique plate per event
- Score submission errors
  - Validate template modalidad/categoria match; ensure numeric-only values for aggregation

**Section sources**
- [routes/auth.py:13-36](file://routes/auth.py#L13-L36)
- [utils/dependencies.py:32-47](file://utils/dependencies.py#L32-L47)
- [routes/participants.py:295-321](file://routes/participants.py#L295-L321)
- [routes/scores.py:63-67](file://routes/scores.py#L63-L67)

## Conclusion
The Juzgamiento system provides a focused, role-aware platform for organizing car audio and tuning competitions. Its modular backend and React frontend enable efficient competition setup, robust participant import, and reliable real-time scoring with dynamic templates. The architecture supports future enhancements such as export endpoints, advanced reporting, and horizontal scaling.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices
- Data model relationships

```mermaid
erDiagram
USERS {
int id PK
string username UK
string password_hash
string role
boolean can_edit_scores
}
EVENTS {
int id PK
string nombre
date fecha
boolean is_active
}
PARTICIPANTS {
int id PK
int evento_id FK
string nombres_apellidos
string marca_modelo
string dni
string telefono
string correo
string club_team
string modalidad
string categoria
string placa_rodaje
}
FORM_TEMPLATES {
int id PK
string modalidad
string categoria
json estructura_json
}
SCORES {
int id PK
int juez_id FK
int participante_id FK
int template_id FK
float puntaje_total
json datos_calificacion
}
USERS ||--o{ SCORES : "creates"
EVENTS ||--o{ PARTICIPANTS : "contains"
PARTICIPANTS ||--o{ SCORES : "evaluated"
FORM_TEMPLATES ||--o{ SCORES : "defines"
```

**Diagram sources**
- [models.py:11-95](file://models.py#L11-L95)