# Regulation Management

<cite>
**Referenced Files in This Document**
- [routes/regulations.py](file://routes/regulations.py)
- [models.py](file://models.py)
- [schemas.py](file://schemas.py)
- [frontend/src/pages/admin/Reglamentos.tsx](file://frontend/src/pages/admin/Reglamentos.tsx)
- [frontend/src/pages/juez/Reglamentos.tsx](file://frontend/src/pages/juez/Reglamentos.tsx)
- [frontend/src/components/FileViewer.tsx](file://frontend/src/components/FileViewer.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [main.py](file://main.py)
- [database.py](file://database.py)
- [utils/dependencies.py](file://utils/dependencies.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Regulation Management Core Components](#regulation-management-core-components)
4. [Data Model](#data-model)
5. [API Endpoints](#api-endpoints)
6. [Frontend Implementation](#frontend-implementation)
7. [Security and Access Control](#security-and-access-control)
8. [File Management](#file-management)
9. [User Interface Components](#user-interface-components)
10. [Integration Patterns](#integration-patterns)
11. [Performance Considerations](#performance-considerations)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Conclusion](#conclusion)

## Introduction

The Regulation Management system is a comprehensive solution for managing official regulations and guidelines within a car audio and tuning competition platform. This system enables administrators to upload, organize, and distribute PDF regulations while providing judges with easy access to relevant documents filtered by competition modalities.

The platform supports two primary user roles: administrators who can upload and manage regulations, and judges who can browse and view regulations specific to their assigned modalities. The system ensures secure access control, efficient file storage, and intuitive user interfaces for both administrative and viewing purposes.

## System Architecture

The Regulation Management system follows a modern full-stack architecture with clear separation of concerns between the backend API, database layer, and frontend interfaces.

```mermaid
graph TB
subgraph "Frontend Layer"
AdminUI[Admin Interface]
JudgeUI[Judge Interface]
FileViewer[File Viewer Component]
end
subgraph "API Layer"
FastAPI[FastAPI Server]
AuthRouter[Authentication Router]
RegulationsRouter[Regulations Router]
end
subgraph "Business Logic"
RegulationService[Regulation Service]
FileStorage[File Storage Manager]
SecurityMiddleware[Security Middleware]
end
subgraph "Data Layer"
SQLite[(SQLite Database)]
Uploads[(Uploads Directory)]
end
AdminUI --> FastAPI
JudgeUI --> FastAPI
FileViewer --> AdminUI
FileViewer --> JudgeUI
FastAPI --> AuthRouter
FastAPI --> RegulationsRouter
FastAPI --> SecurityMiddleware
RegulationsRouter --> RegulationService
RegulationService --> SQLite
RegulationService --> FileStorage
FileStorage --> Uploads
SecurityMiddleware --> SQLite
```

**Diagram sources**
- [main.py:26-48](file://main.py#L26-L48)
- [routes/regulations.py:15](file://routes/regulations.py#L15)
- [utils/dependencies.py:32-47](file://utils/dependencies.py#L32-L47)

## Regulation Management Core Components

### Backend API Implementation

The backend provides a RESTful API for regulation management with comprehensive CRUD operations and file handling capabilities.

```mermaid
classDiagram
class RegulationRouter {
+POST /api/regulations
+GET /api/regulations
+DELETE /api/regulations/{id}
-validateFileType(file)
-generateUniqueFilename(filename)
-saveFileToDisk(file, filename)
}
class RegulationService {
+createRegulation(titulo, modalidad, file)
+listRegulations(modalidad)
+deleteRegulation(id)
+getFileMetadata(id)
}
class Regulation {
+id : int
+titulo : string
+modalidad : string
+archivo_url : string
+created_at : datetime
}
class RegulationResponse {
+id : int
+titulo : string
+modalidad : string
+archivo_url : string
}
RegulationRouter --> RegulationService : uses
RegulationService --> Regulation : manages
RegulationService --> RegulationResponse : returns
```

**Diagram sources**
- [routes/regulations.py:20-110](file://routes/regulations.py#L20-L110)
- [models.py:104-111](file://models.py#L104-L111)
- [schemas.py:156-162](file://schemas.py#L156-L162)

### Frontend Application Architecture

The frontend consists of two distinct interfaces designed for different user roles with shared components for file viewing and API communication.

```mermaid
graph LR
subgraph "Admin Interface"
AdminPage[Admin Regulations Page]
UploadForm[Upload Form]
RegulationList[Regulation List]
end
subgraph "Judge Interface"
JudgePage[Judge Regulations Page]
FilterModalities[Modalities Filter]
JudgeRegulationList[Judge Regulation List]
end
subgraph "Shared Components"
FileViewer[File Viewer]
APIClient[API Client]
AuthContext[Auth Context]
end
AdminPage --> UploadForm
AdminPage --> RegulationList
JudgePage --> FilterModalities
JudgePage --> JudgeRegulationList
UploadForm --> APIClient
RegulationList --> APIClient
FilterModalities --> APIClient
JudgeRegulationList --> APIClient
APIClient --> FileViewer
AuthContext --> AdminPage
AuthContext --> JudgePage
```

**Diagram sources**
- [frontend/src/pages/admin/Reglamentos.tsx:22-302](file://frontend/src/pages/admin/Reglamentos.tsx#L22-L302)
- [frontend/src/pages/juez/Reglamentos.tsx:15-171](file://frontend/src/pages/juez/Reglamentos.tsx#L15-L171)
- [frontend/src/components/FileViewer.tsx:17-157](file://frontend/src/components/FileViewer.tsx#L17-L157)

**Section sources**
- [routes/regulations.py:15-110](file://routes/regulations.py#L15-L110)
- [frontend/src/pages/admin/Reglamentos.tsx:22-302](file://frontend/src/pages/admin/Reglamentos.tsx#L22-L302)
- [frontend/src/pages/juez/Reglamentos.tsx:15-171](file://frontend/src/pages/juez/Reglamentos.tsx#L15-L171)

## Data Model

The system uses a relational database design with SQLAlchemy ORM for data persistence and management.

```mermaid
erDiagram
REGULATIONS {
int id PK
string titulo
string modalidad
string archivo_url
}
USERS {
int id PK
string username
string password_hash
string role
boolean can_edit_scores
json modalidades_asignadas
}
MODALITIES {
int id PK
string nombre
}
CATEGORIES {
int id PK
string nombre
int modality_id FK
}
SUBCATEGORIES {
int id PK
string nombre
int category_id FK
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
REGULATIONS ||--o{ USERS : "referenced_by"
MODALITIES ||--o{ CATEGORIES : "contains"
CATEGORIES ||--o{ SUBCATEGORIES : "contains"
EVENTS ||--o{ PARTICIPANTS : "contains"
FORM_TEMPLATES ||--o{ SCORES : "used_in"
USERS ||--o{ SCORES : "creates"
PARTICIPANTS ||--o{ SCORES : "evaluated_by"
```

**Diagram sources**
- [models.py:104-153](file://models.py#L104-L153)

**Section sources**
- [models.py:104-153](file://models.py#L104-L153)

## API Endpoints

The system provides three primary endpoints for regulation management operations:

### Create Regulation Endpoint

```mermaid
sequenceDiagram
participant Admin as Administrator
participant API as API Server
participant Storage as File Storage
participant DB as Database
Admin->>API : POST /api/regulations (multipart/form-data)
API->>API : Validate PDF file type
API->>API : Generate unique filename
API->>Storage : Save file to disk
Storage-->>API : File saved successfully
API->>DB : Create regulation record
DB-->>API : Regulation created
API-->>Admin : RegulationResponse
Note over Admin,Storage : File stored in uploads/ directory
Note over API,DB : Database record created in regulations table
```

**Diagram sources**
- [routes/regulations.py:20-64](file://routes/regulations.py#L20-L64)

### List Regulations Endpoint

```mermaid
sequenceDiagram
participant Judge as Judge
participant API as API Server
participant DB as Database
Judge->>API : GET /api/regulations?modalidad=SPL
API->>DB : Query regulations by modalidad
DB-->>API : Filtered regulations list
API-->>Judge : Array of RegulationResponse
Note over Judge,API : Optional modalidad parameter filters results
```

**Diagram sources**
- [routes/regulations.py:67-79](file://routes/regulations.py#L67-L79)

### Delete Regulation Endpoint

```mermaid
sequenceDiagram
participant Admin as Administrator
participant API as API Server
participant Storage as File Storage
participant DB as Database
Admin->>API : DELETE /api/regulations/{id}
API->>DB : Find regulation by ID
DB-->>API : Regulation found
API->>Storage : Delete physical file
Storage-->>API : File deleted
API->>DB : Delete database record
DB-->>API : Record deleted
API-->>Admin : Success message
Note over API,Storage : File removal handled gracefully
```

**Diagram sources**
- [routes/regulations.py:82-110](file://routes/regulations.py#L82-L110)

**Section sources**
- [routes/regulations.py:20-110](file://routes/regulations.py#L20-L110)

## Frontend Implementation

### Admin Interface

The administrator interface provides comprehensive tools for uploading, managing, and organizing regulations.

```mermaid
flowchart TD
Start([Admin Page Load]) --> LoadRegulations["Load All Regulations"]
LoadRegulations --> DisplayList["Display Regulations List"]
UploadForm["Upload Form"] --> ValidateInputs["Validate Inputs"]
ValidateInputs --> CheckPDF{"PDF Selected?"}
CheckPDF --> |No| ShowError["Show Validation Error"]
CheckPDF --> |Yes| SubmitForm["Submit Form Data"]
SubmitForm --> CreateFormData["Create FormData Object"]
CreateFormData --> SendRequest["Send POST Request"]
SendRequest --> HandleSuccess["Handle Success Response"]
HandleSuccess --> ClearForm["Clear Form Fields"]
ClearForm --> ReloadList["Reload Regulations List"]
DisplayList --> ViewRegulation["View Regulation"]
DisplayList --> DeleteRegulation["Delete Regulation"]
DeleteRegulation --> ConfirmDelete["Confirm Deletion"]
ConfirmDelete --> SendDeleteRequest["Send DELETE Request"]
SendDeleteRequest --> ReloadList
ShowError --> WaitUser["Wait for User Correction"]
WaitUser --> UploadForm
ReloadList --> DisplayList
```

**Diagram sources**
- [frontend/src/pages/admin/Reglamentos.tsx:44-125](file://frontend/src/pages/admin/Reglamentos.tsx#L44-L125)

### Judge Interface

The judge interface focuses on efficient access to relevant regulations based on assigned modalities.

```mermaid
flowchart TD
JudgeLoad([Judge Page Load]) --> CheckModalidad["Check URL Parameters"]
CheckModalidad --> LoadRegulations["Load Regulations"]
LoadRegulations --> DisplayResults["Display Results"]
DisplayResults --> HasResults{"Any Results?"}
HasResults --> |Yes| ShowRegulations["Show Regulation Cards"]
HasResults --> |No| ShowEmpty["Show Empty State"]
ShowRegulations --> ViewRegulation["View PDF"]
ViewRegulation --> OpenViewer["Open File Viewer"]
OpenViewer --> DisplayPDF["Display PDF Content"]
DisplayPDF --> CloseViewer["Close Viewer"]
ShowEmpty --> ShowMessage["Show 'No Regulations' Message"]
CloseViewer --> DisplayResults
ShowMessage --> DisplayResults
```

**Diagram sources**
- [frontend/src/pages/juez/Reglamentos.tsx:26-52](file://frontend/src/pages/juez/Reglamentos.tsx#L26-L52)

**Section sources**
- [frontend/src/pages/admin/Reglamentos.tsx:22-302](file://frontend/src/pages/admin/Reglamentos.tsx#L22-L302)
- [frontend/src/pages/juez/Reglamentos.tsx:15-171](file://frontend/src/pages/juez/Reglamentos.tsx#L15-L171)

## Security and Access Control

The system implements role-based access control to ensure appropriate permissions for different user types.

```mermaid
graph TD
subgraph "Authentication Flow"
Token[JWT Token]
Decode[Token Decoding]
Validate[User Validation]
RoleCheck[Role Verification]
end
subgraph "Access Control Matrix"
AdminAccess[Admin Access]
JudgeAccess[Judge Access]
PublicAccess[Public Access]
end
subgraph "Protected Routes"
AdminRoutes[Admin Routes]
JudgeRoutes[Judge Routes]
PublicRoutes[Public Routes]
end
Token --> Decode
Decode --> Validate
Validate --> RoleCheck
RoleCheck --> AdminAccess
RoleCheck --> JudgeAccess
RoleCheck --> PublicAccess
AdminAccess --> AdminRoutes
JudgeAccess --> JudgeRoutes
PublicAccess --> PublicRoutes
AdminRoutes -.->|Upload/Delete| Regulations["/api/regulations/*"]
JudgeRoutes -.->|Read Only| Regulations
PublicRoutes -.->|View Only| Regulations
```

**Diagram sources**
- [utils/dependencies.py:32-47](file://utils/dependencies.py#L32-L47)
- [routes/regulations.py:25](file://routes/regulations.py#L25)

The system uses JWT tokens for authentication and implements middleware to verify user roles before granting access to protected endpoints. Administrators have full CRUD permissions while judges have read-only access to regulations.

**Section sources**
- [utils/dependencies.py:16-71](file://utils/dependencies.py#L16-L71)
- [routes/regulations.py:25-38](file://routes/regulations.py#L25-L38)

## File Management

The system handles PDF file uploads with comprehensive validation and storage management.

```mermaid
flowchart TD
FileUpload["PDF File Upload"] --> ValidateType["Validate File Type"]
ValidateType --> TypeValid{"Is PDF?"}
TypeValid --> |No| RejectUpload["Reject Upload - Not PDF"]
TypeValid --> |Yes| GenerateName["Generate Unique Filename"]
GenerateName --> SaveFile["Save to Disk"]
SaveFile --> CreateRecord["Create Database Record"]
CreateRecord --> ReturnSuccess["Return Success Response"]
RejectUpload --> ShowError["Show Error Message"]
ShowError --> WaitCorrection["Wait for Corrected File"]
WaitCorrection --> FileUpload
```

**Diagram sources**
- [routes/regulations.py:29-64](file://routes/regulations.py#L29-L64)

### File Storage Architecture

The system implements a structured file storage approach with automatic cleanup and error handling.

```mermaid
graph TB
subgraph "Upload Process"
UploadRequest[Upload Request]
FileValidation[File Validation]
UniqueFilename[Generate Unique Filename]
SaveToDisk[Save to Disk]
end
subgraph "Storage Location"
UploadsDir[uploads/ Directory]
PDFFile[PDF File]
DatabaseRecord[Database Record]
end
subgraph "Cleanup Process"
DeleteRequest[Delete Request]
RemoveFile[Remove Physical File]
DeleteRecord[Delete Database Record]
end
UploadRequest --> FileValidation
FileValidation --> UniqueFilename
UniqueFilename --> SaveToDisk
SaveToDisk --> UploadsDir
UploadsDir --> PDFFile
SaveToDisk --> DatabaseRecord
DeleteRequest --> RemoveFile
RemoveFile --> DeleteRecord
```

**Diagram sources**
- [routes/regulations.py:42-107](file://routes/regulations.py#L42-L107)
- [main.py:20-47](file://main.py#L20-L47)

**Section sources**
- [routes/regulations.py:17-110](file://routes/regulations.py#L17-L110)
- [main.py:20-47](file://main.py#L20-L47)

## User Interface Components

### File Viewer Component

The File Viewer component provides a unified interface for displaying various file types with responsive design and error handling.

```mermaid
classDiagram
class FileViewer {
+string url
+string title
+function onClose
+boolean isLoading
+string error
+render() ReactElement
-getServerRoot() string
-handleLoad() void
-handleError() void
}
class PDFViewer {
+object data
+string type
+function onLoad
+function onError
}
class ImageViewer {
+string src
+string alt
+function onLoad
+function onError
}
class GenericViewer {
+string url
+function downloadFile() void
}
FileViewer --> PDFViewer : renders for PDF
FileViewer --> ImageViewer : renders for images
FileViewer --> GenericViewer : renders for other files
```

**Diagram sources**
- [frontend/src/components/FileViewer.tsx:17-157](file://frontend/src/components/FileViewer.tsx#L17-L157)

### API Communication Layer

The system uses a centralized API client with error handling and authentication support.

```mermaid
sequenceDiagram
participant Component as React Component
participant API as API Client
participant Auth as Authentication
participant Server as FastAPI Server
Component->>API : api.get('/api/regulations')
API->>Auth : Get Bearer Token
Auth-->>API : Token
API->>Server : GET /api/regulations
Server-->>API : JSON Response
API-->>Component : Data
Component->>API : api.post('/api/regulations', formData)
API->>Auth : Get Bearer Token
Auth-->>API : Token
API->>Server : POST /api/regulations
Server-->>API : Created Response
API-->>Component : Success
Note over Component,Server : Automatic error handling and token management
```

**Diagram sources**
- [frontend/src/lib/api.ts:11-41](file://frontend/src/lib/api.ts#L11-L41)

**Section sources**
- [frontend/src/components/FileViewer.tsx:17-157](file://frontend/src/components/FileViewer.tsx#L17-L157)
- [frontend/src/lib/api.ts:11-41](file://frontend/src/lib/api.ts#L11-L41)

## Integration Patterns

### CORS Configuration

The system implements comprehensive CORS policies to support development and production environments.

```mermaid
graph LR
subgraph "CORS Configuration"
AllowOrigins["Allow All Origins"]
AllowCredentials["Allow Credentials"]
AllowMethods["Allow All Methods"]
AllowHeaders["Allow All Headers"]
end
subgraph "Security Considerations"
Production["Production Deployment"]
Development["Development Environment"]
Localhost["Localhost Access"]
end
AllowOrigins --> Production
AllowCredentials --> Production
AllowMethods --> Development
AllowHeaders --> Localhost
Production --> Secure["Secure Production Setup"]
Development --> Flexible["Flexible Development Setup"]
Localhost --> Accessible["Accessible Local Setup"]
```

**Diagram sources**
- [main.py:28-34](file://main.py#L28-L34)

### Static File Serving

The system serves uploaded files through FastAPI's static file mounting capability.

```mermaid
graph TB
subgraph "Static File Configuration"
MountPoint[/uploads]
Directory[uploads/]
StaticFiles[StaticFiles]
end
subgraph "File Access"
Browser[Browser Request]
Server[FastAPI Server]
FileSystem[File System]
end
Browser --> Server
Server --> StaticFiles
StaticFiles --> Directory
Directory --> FileSystem
FileSystem --> PDFContent[PDF Content]
PDFContent --> Browser
```

**Diagram sources**
- [main.py:46-47](file://main.py#L46-L47)

**Section sources**
- [main.py:28-47](file://main.py#L28-L47)

## Performance Considerations

### Database Optimization

The system implements several optimization strategies for efficient data retrieval and storage:

- **Indexing**: Strategic indexing on frequently queried fields like `modalidad` and `titulo`
- **Query Optimization**: Efficient filtering and ordering mechanisms
- **Connection Pooling**: Proper session management for concurrent requests
- **Memory Management**: Optimized file handling to prevent memory leaks

### Frontend Performance

The React-based frontend implements performance best practices:

- **Component Memoization**: Efficient rendering of regulation lists
- **Lazy Loading**: Conditional loading of file viewer components
- **State Management**: Optimized state updates and re-renders
- **Error Boundaries**: Graceful error handling without full page reloads

### File Handling Performance

- **Asynchronous Operations**: Non-blocking file upload and download operations
- **Stream Processing**: Efficient file streaming for large PDFs
- **Caching Strategies**: Appropriate caching for static assets
- **Resource Cleanup**: Automatic cleanup of temporary resources

## Troubleshooting Guide

### Common Issues and Solutions

#### File Upload Failures

**Problem**: PDF files fail to upload with validation errors
**Solution**: 
- Verify file is a valid PDF format
- Check file size limitations
- Ensure proper MIME type detection
- Verify write permissions for uploads directory

#### Access Control Issues

**Problem**: Users receive 403 Forbidden errors
**Solution**:
- Verify user role in database
- Check JWT token validity
- Ensure proper authentication headers
- Validate user permissions for requested actions

#### File Viewing Problems

**Problem**: PDF files don't display properly in viewer
**Solution**:
- Check browser PDF support
- Verify file integrity and accessibility
- Ensure proper MIME type configuration
- Test with different browsers and devices

#### Database Connection Issues

**Problem**: Application fails to connect to database
**Solution**:
- Verify SQLite database file exists
- Check file permissions for database and uploads
- Ensure proper database initialization
- Validate connection string format

**Section sources**
- [routes/regulations.py:29-49](file://routes/regulations.py#L29-L49)
- [utils/dependencies.py:32-69](file://utils/dependencies.py#L32-L69)
- [frontend/src/lib/api.ts:24-40](file://frontend/src/lib/api.ts#L24-L40)

## Conclusion

The Regulation Management system provides a robust, scalable solution for managing competition regulations within the car audio and tuning industry. The system successfully balances functionality, security, and user experience through its comprehensive architecture.

Key strengths of the system include:

- **Role-Based Access Control**: Clear separation between administrator and judge functionalities
- **Efficient File Management**: Secure PDF handling with proper validation and storage
- **Responsive User Interfaces**: Intuitive designs optimized for different user roles
- **Scalable Architecture**: Modular design supporting future enhancements
- **Comprehensive Error Handling**: Robust error management across all system components

The system's implementation demonstrates best practices in modern web development, combining Python's FastAPI for backend services with React for frontend interfaces, while maintaining security, performance, and maintainability standards.

Future enhancements could include advanced search capabilities, regulation versioning, collaborative editing features, and integration with external document management systems. The current architecture provides a solid foundation for such extensions while maintaining backward compatibility and system stability.