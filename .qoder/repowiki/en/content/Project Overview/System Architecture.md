# System Architecture

<cite>
**Referenced Files in This Document**
- [main.py](file://main.py)
- [database.py](file://database.py)
- [models.py](file://models.py)
- [schemas.py](file://schemas.py)
- [routes/auth.py](file://routes/auth.py)
- [routes/events.py](file://routes/events.py)
- [routes/participants.py](file://routes/participants.py)
- [routes/scores.py](file://routes/scores.py)
- [routes/templates.py](file://routes/templates.py)
- [routes/users.py](file://routes/users.py)
- [utils/dependencies.py](file://utils/dependencies.py)
- [utils/security.py](file://utils/security.py)
- [frontend/src/contexts/AuthContext.tsx](file://frontend/src/contexts/AuthContext.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/lib/judging.ts](file://frontend/src/lib/judging.ts)
- [frontend/src/pages/Login.tsx](file://frontend/src/pages/Login.tsx)
- [frontend/src/App.tsx](file://frontend/src/App.tsx)
- [requirements.txt](file://requirements.txt)
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
This document describes the architecture of the Juzgamiento system, a web application for managing car audio and tuning competitions. The system follows a clear separation between a React-based frontend and a FastAPI backend. It implements layered architecture with distinct concerns for frontend contexts, API routes, database models, and utility modules. The backend uses SQLAlchemy ORM with a local SQLite database, JWT-based authentication, and role-based access control. The frontend manages authentication state via a React context and communicates with the backend through typed API utilities.

## Project Structure
The repository is organized into:
- Backend: FastAPI application with routers under routes/, database and models definitions, Pydantic schemas, and shared utilities.
- Frontend: React application using Vite, organized into contexts, pages, and libraries for API and domain types.

```mermaid
graph TB
subgraph "Frontend (React)"
FE_App["App.tsx"]
FE_Login["Login.tsx"]
FE_Auth["AuthContext.tsx"]
FE_API["api.ts"]
FE_Judging["judging.ts"]
end
subgraph "Backend (FastAPI)"
BE_Main["main.py"]
BE_DB["database.py"]
BE_Models["models.py"]
BE_Schemas["schemas.py"]
BE_Routes_Auth["routes/auth.py"]
BE_Routes_Events["routes/events.py"]
BE_Routes_Participants["routes/participants.py"]
BE_Routes_Scores["routes/scores.py"]
BE_Routes_Templates["routes/templates.py"]
BE_Routes_Users["routes/users.py"]
BE_Utils_Deps["utils/dependencies.py"]
BE_Utils_Security["utils/security.py"]
end
FE_App --> FE_Auth
FE_Login --> FE_Auth
FE_Auth --> FE_API
FE_API --> BE_Main
BE_Main --> BE_DB
BE_Main --> BE_Routes_Auth
BE_Main --> BE_Routes_Events
BE_Main --> BE_Routes_Participants
BE_Main --> BE_Routes_Scores
BE_Main --> BE_Routes_Templates
BE_Main --> BE_Routes_Users
BE_Routes_Auth --> BE_Utils_Security
BE_Routes_Auth --> BE_Models
BE_Routes_Events --> BE_Models
BE_Routes_Participants --> BE_Models
BE_Routes_Scores --> BE_Models
BE_Routes_Templates --> BE_Models
BE_Routes_Users --> BE_Models
BE_Routes_Events --> BE_Utils_Deps
BE_Routes_Participants --> BE_Utils_Deps
BE_Routes_Scores --> BE_Utils_Deps
BE_Routes_Templates --> BE_Utils_Deps
BE_Routes_Users --> BE_Utils_Deps
BE_DB --> BE_Models
BE_Models --> BE_Schemas
```

**Diagram sources**
- [main.py:17-32](file://main.py#L17-L32)
- [database.py:15-34](file://database.py#L15-L34)
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:10-152](file://schemas.py#L10-L152)
- [routes/auth.py:10-35](file://routes/auth.py#L10-L35)
- [routes/events.py:10-73](file://routes/events.py#L10-L73)
- [routes/participants.py:21-399](file://routes/participants.py#L21-L399)
- [routes/scores.py:13-131](file://routes/scores.py#L13-L131)
- [routes/templates.py:10-63](file://routes/templates.py#L10-L63)
- [routes/users.py:18-191](file://routes/users.py#L18-L191)
- [utils/dependencies.py:12-70](file://utils/dependencies.py#L12-L70)
- [utils/security.py:9-50](file://utils/security.py#L9-L50)
- [frontend/src/App.tsx:91-118](file://frontend/src/App.tsx#L91-L118)
- [frontend/src/pages/Login.tsx:15-61](file://frontend/src/pages/Login.tsx#L15-L61)
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)
- [frontend/src/lib/api.ts:4-32](file://frontend/src/lib/api.ts#L4-L32)
- [frontend/src/lib/judging.ts:1-64](file://frontend/src/lib/judging.ts#L1-L64)

**Section sources**
- [main.py:17-32](file://main.py#L17-L32)
- [frontend/src/App.tsx:91-118](file://frontend/src/App.tsx#L91-L118)

## Core Components
- Backend entrypoint and routing:
  - Application initialization, CORS middleware, database bootstrap, and router registration.
- Database and models:
  - SQLAlchemy declarative base, engine, session factory, and migration helper; ORM models for users, events, participants, form templates, and scores.
- Schemas:
  - Pydantic models for request/response validation and typed role definitions.
- Authentication and authorization:
  - JWT utilities for hashing, verification, token creation/decoding; dependency injectors for current user, roles, and optional auth.
- API routes:
  - Auth, Events, Participants (including Excel upload), Scores, Templates, and Users with role-gated endpoints.
- Frontend:
  - Authentication context with token parsing and persistence; API client with error handling; typed domain models; routing with protected/admin/judge guards.

**Section sources**
- [main.py:14-37](file://main.py#L14-L37)
- [database.py:15-93](file://database.py#L15-L93)
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:7-152](file://schemas.py#L7-L152)
- [utils/security.py:9-50](file://utils/security.py#L9-L50)
- [utils/dependencies.py:12-70](file://utils/dependencies.py#L12-L70)
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)
- [routes/events.py:13-73](file://routes/events.py#L13-L73)
- [routes/participants.py:181-399](file://routes/participants.py#L181-L399)
- [routes/scores.py:43-131](file://routes/scores.py#L43-L131)
- [routes/templates.py:13-63](file://routes/templates.py#L13-L63)
- [routes/users.py:29-191](file://routes/users.py#L29-L191)
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)
- [frontend/src/lib/api.ts:4-32](file://frontend/src/lib/api.ts#L4-L32)
- [frontend/src/lib/judging.ts:1-64](file://frontend/src/lib/judging.ts#L1-L64)
- [frontend/src/pages/Login.tsx:15-61](file://frontend/src/pages/Login.tsx#L15-L61)
- [frontend/src/App.tsx:52-88](file://frontend/src/App.tsx#L52-L88)

## Architecture Overview
The system follows a layered architecture:
- Presentation Layer (Frontend): React components, routing, and state via context.
- Application Layer (Backend): FastAPI routers exposing REST endpoints.
- Domain and Persistence Layers (Backend): Pydantic schemas, SQLAlchemy models, and database sessions.

```mermaid
graph TB
subgraph "Presentation Layer"
UI_Login["Login Page"]
UI_Admin["Admin Pages"]
UI_Judge["Judge Pages"]
Ctx_Auth["AuthContext"]
end
subgraph "Application Layer"
R_Auth["/api/login"]
R_Events["/api/events/*"]
R_Participants["/api/participants/*"]
R_Scores["/api/scores/*"]
R_Templates["/api/templates/*"]
R_Users["/api/users/*"]
Deps["Dependencies & Security"]
end
subgraph "Domain/Persistence Layer"
DB["SQLite via SQLAlchemy"]
Models["ORM Models"]
Schemas["Pydantic Schemas"]
end
UI_Login --> Ctx_Auth
UI_Admin --> Ctx_Auth
UI_Judge --> Ctx_Auth
Ctx_Auth --> R_Auth
Ctx_Auth --> R_Events
Ctx_Auth --> R_Participants
Ctx_Auth --> R_Scores
Ctx_Auth --> R_Templates
Ctx_Auth --> R_Users
R_Auth --> Deps
R_Events --> Deps
R_Participants --> Deps
R_Scores --> Deps
R_Templates --> Deps
R_Users --> Deps
Deps --> Models
Models --> DB
Schemas --> Models
```

**Diagram sources**
- [frontend/src/App.tsx:91-118](file://frontend/src/App.tsx#L91-L118)
- [frontend/src/pages/Login.tsx:15-61](file://frontend/src/pages/Login.tsx#L15-L61)
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)
- [routes/events.py:13-73](file://routes/events.py#L13-L73)
- [routes/participants.py:181-399](file://routes/participants.py#L181-L399)
- [routes/scores.py:43-131](file://routes/scores.py#L43-L131)
- [routes/templates.py:13-63](file://routes/templates.py#L13-L63)
- [routes/users.py:29-191](file://routes/users.py#L29-L191)
- [utils/dependencies.py:12-70](file://utils/dependencies.py#L12-L70)
- [database.py:15-34](file://database.py#L15-L34)
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:10-152](file://schemas.py#L10-L152)

## Detailed Component Analysis

### Authentication and Authorization Flow
The system uses JWT for stateless authentication. The frontend stores a token in local storage and sends it with each request. The backend validates tokens and enforces role-based access.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant FE as "AuthContext"
participant API as "FastAPI"
participant DB as "Database"
participant Sec as "Security Utils"
Browser->>FE : "Submit login form"
FE->>API : "POST /api/login"
API->>DB : "Lookup user by username"
DB-->>API : "User record"
API->>Sec : "Verify password hash"
Sec-->>API : "Verification result"
API->>Sec : "Create access token (claims : sub, user_id, role)"
Sec-->>API : "JWT"
API-->>FE : "TokenResponse"
FE->>Browser : "Persist token in localStorage"
FE-->>Browser : "Set session state"
```

**Diagram sources**
- [frontend/src/contexts/AuthContext.tsx:95-111](file://frontend/src/contexts/AuthContext.tsx#L95-L111)
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)
- [utils/security.py:29-39](file://utils/security.py#L29-L39)
- [utils/dependencies.py:50-70](file://utils/dependencies.py#L50-L70)

**Section sources**
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)
- [utils/security.py:9-50](file://utils/security.py#L9-L50)
- [utils/dependencies.py:12-70](file://utils/dependencies.py#L12-L70)
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)

### Data Model Layer
The backend defines core entities and relationships using SQLAlchemy ORM. The schema module provides Pydantic models for validation and serialization.

```mermaid
classDiagram
class User {
+int id
+string username
+string password_hash
+string role
+bool can_edit_scores
}
class Event {
+int id
+string nombre
+date fecha
+bool is_active
}
class Participant {
+int id
+int evento_id
+string nombres_apellidos
+string nombre_competidor
+string auto_marca_modelo
+string dni
+string telefono
+string correo
+string club_team
+string marca_modelo
+string modalidad
+string categoria
+string placa_matricula
+string placa_rodaje
}
class FormTemplate {
+int id
+string modalidad
+string categoria
+list estructura_json
}
class Score {
+int id
+int juez_id
+int participante_id
+int template_id
+float puntaje_total
+dict datos_calificacion
}
User "1" --> "many" Score : "creates"
Event "1" --> "many" Participant : "contains"
FormTemplate "1" --> "many" Score : "defines"
Participant "1" --> "many" Score : "is scored"
```

**Diagram sources**
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:10-152](file://schemas.py#L10-L152)

**Section sources**
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:10-152](file://schemas.py#L10-L152)

### Frontend State Management and Routing
The frontend uses a React context to manage authentication state and persists it in local storage. Routing enforces role-based access and redirects based on user roles.

```mermaid
flowchart TD
Start(["App Mount"]) --> CheckAuth["Check local storage for session"]
CheckAuth --> HasSession{"Session exists?"}
HasSession --> |Yes| Hydrate["Hydrate AuthContext from token"]
HasSession --> |No| LoadingDone["Set loading=false"]
Hydrate --> SetUser["Set user state"]
SetUser --> DecideRole{"Role=admin?"}
DecideRole --> |Yes| AdminRoute["Navigate to /admin"]
DecideRole --> |No| JudgeRoute["Navigate to /juez"]
LoadingDone --> PublicRoute["Render Login if not authenticated"]
```

**Diagram sources**
- [frontend/src/contexts/AuthContext.tsx:70-93](file://frontend/src/contexts/AuthContext.tsx#L70-L93)
- [frontend/src/App.tsx:32-88](file://frontend/src/App.tsx#L32-L88)
- [frontend/src/pages/Login.tsx:25-36](file://frontend/src/pages/Login.tsx#L25-L36)

**Section sources**
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)
- [frontend/src/App.tsx:52-88](file://frontend/src/App.tsx#L52-L88)
- [frontend/src/pages/Login.tsx:15-61](file://frontend/src/pages/Login.tsx#L15-L61)

### Client-Server Communication Patterns
The frontend communicates with the backend using an Axios client configured with a base URL derived from environment or browser context. Error messages are normalized for user feedback.

```mermaid
sequenceDiagram
participant FE as "Frontend Component"
participant Ctx as "AuthContext"
participant AX as "Axios Client"
participant API as "FastAPI Router"
participant DB as "Database"
FE->>Ctx : "Call login()"
Ctx->>AX : "POST /api/login"
AX->>API : "HTTP Request"
API->>DB : "Query user"
DB-->>API : "User"
API-->>AX : "TokenResponse"
AX-->>Ctx : "Response"
Ctx-->>FE : "Session object"
```

**Diagram sources**
- [frontend/src/contexts/AuthContext.tsx:95-111](file://frontend/src/contexts/AuthContext.tsx#L95-L111)
- [frontend/src/lib/api.ts:4-32](file://frontend/src/lib/api.ts#L4-L32)
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)

**Section sources**
- [frontend/src/lib/api.ts:4-32](file://frontend/src/lib/api.ts#L4-L32)
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)

### Clean Architecture and MVC Alignment
- Clean Architecture principles:
  - Entities (models) encapsulate business rules.
  - Use cases (routers) orchestrate application-specific business rules.
  - Interfaces (schemas) define data contracts.
  - External concerns (database, security) are injected via dependencies.
- MVC alignment:
  - Views: React pages and layouts.
  - Controllers: FastAPI routers.
  - Models: SQLAlchemy ORM and Pydantic schemas.

**Section sources**
- [models.py:11-95](file://models.py#L11-L95)
- [schemas.py:10-152](file://schemas.py#L10-L152)
- [routes/auth.py:13-35](file://routes/auth.py#L13-L35)
- [frontend/src/App.tsx:91-118](file://frontend/src/App.tsx#L91-L118)

### Dependency Injection Mechanisms
- FastAPI dependency injection:
  - Database session provider yields a scoped session per request.
  - OAuth2 password bearer scheme extracts and validates tokens.
  - Role-based dependency providers enforce permissions.
- Frontend dependency injection:
  - React context provides authentication state and actions to components.

**Section sources**
- [database.py:28-33](file://database.py#L28-L33)
- [utils/dependencies.py:12-70](file://utils/dependencies.py#L12-L70)
- [frontend/src/contexts/AuthContext.tsx:66-131](file://frontend/src/contexts/AuthContext.tsx#L66-L131)

### Concurrent Users, Sessions, and Real-Time Evaluation
- Concurrency:
  - SQLite is used locally; concurrent writes may require careful handling. Consider database locks and transaction boundaries.
- Sessions:
  - Stateless JWT tokens stored in local storage; token expiration is enforced server-side.
- Real-time evaluation:
  - No WebSocket or real-time updates are present in the current codebase. Scores are submitted via REST endpoints.

**Section sources**
- [database.py:20-23](file://database.py#L20-L23)
- [utils/security.py:9-14](file://utils/security.py#L9-L14)
- [routes/scores.py:43-131](file://routes/scores.py#L43-L131)

## Dependency Analysis
The backend depends on FastAPI, SQLAlchemy, Pydantic, bcrypt, and python-jose for cryptography. The frontend uses React, React Router, and Axios.

```mermaid
graph LR
Req["requirements.txt"] --> FastAPI["fastapi"]
Req --> Uvicorn["uvicorn"]
Req --> SQLA["sqlalchemy"]
Req --> Pandas["pandas"]
Req --> Openpyxl["openpyxl"]
Req --> MultiPart["python-multipart"]
Req --> Httpx["httpx"]
Req --> Bcrypt["bcrypt"]
Req --> Jose["python-jose"]
FE["Frontend"] --> Axios["axios"]
FE --> React["react"]
FE --> Router["react-router-dom"]
```

**Diagram sources**
- [requirements.txt:1-10](file://requirements.txt#L1-L10)
- [frontend/src/lib/api.ts:1](file://frontend/src/lib/api.ts#L1)

**Section sources**
- [requirements.txt:1-10](file://requirements.txt#L1-L10)
- [frontend/src/lib/api.ts:1](file://frontend/src/lib/api.ts#L1)

## Performance Considerations
- Database:
  - SQLite is suitable for small to medium workloads. For higher concurrency, consider a relational database with connection pooling.
  - Indexes exist on foreign keys and frequently queried columns; ensure migrations are applied consistently.
- API:
  - Use pagination for large lists (e.g., participants, scores).
  - Consider caching for read-heavy endpoints where appropriate.
- Frontend:
  - Avoid unnecessary re-renders by using memoization and stable callbacks.
  - Debounce heavy operations like Excel uploads.

## Troubleshooting Guide
- Authentication failures:
  - Verify JWT secret and algorithm configuration; ensure clients send the token in the expected format.
- Database migration errors:
  - Confirm migration steps are executed; check for missing columns and indexes.
- Excel upload issues:
  - Validate column names against supported aliases; ensure required fields are present and plates are unique.
- Role-based access errors:
  - Confirm token claims include the correct role; verify user permissions.

**Section sources**
- [utils/security.py:9-14](file://utils/security.py#L9-L14)
- [database.py:36-93](file://database.py#L36-L93)
- [routes/participants.py:286-399](file://routes/participants.py#L286-L399)
- [utils/dependencies.py:32-47](file://utils/dependencies.py#L32-L47)

## Conclusion
The Juzgamiento system demonstrates a clear separation of concerns between the React frontend and FastAPI backend, with well-defined layers for models, schemas, routes, and utilities. JWT-based authentication and role-based access control provide secure access patterns. While the current implementation focuses on REST-based interactions, the architecture supports future enhancements such as database scaling and optional real-time capabilities.

## Appendices
- Technology Stack Integration Points:
  - Backend: FastAPI, SQLAlchemy, Pydantic, bcrypt, python-jose.
  - Frontend: React, React Router, Axios.

**Section sources**
- [requirements.txt:1-10](file://requirements.txt#L1-L10)
- [frontend/src/lib/api.ts:1](file://frontend/src/lib/api.ts#L1)