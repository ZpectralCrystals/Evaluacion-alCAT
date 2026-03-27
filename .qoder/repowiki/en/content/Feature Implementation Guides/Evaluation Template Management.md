# Evaluation Template Management

<cite>
**Referenced Files in This Document**
- [routes/evaluation_templates.py](file://routes/evaluation_templates.py)
- [routes/modalities.py](file://routes/modalities.py)
- [routes/scorecards.py](file://routes/scorecards.py)
- [routes/judge_assignments.py](file://routes/judge_assignments.py)
- [models.py](file://models.py)
- [schemas.py](file://schemas.py)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx)
- [frontend/src/pages/admin/TemplatesList.tsx](file://frontend/src/pages/admin/TemplatesList.tsx)
- [frontend/src/lib/judging.ts](file://frontend/src/lib/judging.ts)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/pages/admin/AdminLayout.tsx](file://frontend/src/pages/admin/AdminLayout.tsx)
- [frontend/src/components/template-editor/index.ts](file://frontend/src/components/template-editor/index.ts)
- [frontend/src/components/template-editor/types.ts](file://frontend/src/components/template-editor/types.ts)
- [frontend/src/components/template-editor/utils.ts](file://frontend/src/components/template-editor/utils.ts)
- [frontend/src/components/template-editor/TemplateSectionCard.tsx](file://frontend/src/components/template-editor/TemplateSectionCard.tsx)
- [frontend/src/components/template-editor/TemplateItemCard.tsx](file://frontend/src/components/template-editor/TemplateItemCard.tsx)
- [frontend/src/components/template-editor/CategorizationOptionRow.tsx](file://frontend/src/components/template-editor/CategorizationOptionRow.tsx)
- [frontend/src/components/template-editor/BonificationSection.tsx](file://frontend/src/components/template-editor/BonificationSection.tsx)
- [frontend/src/components/template-editor/JsonPreview.tsx](file://frontend/src/components/template-editor/JsonPreview.tsx)
- [main.py](file://main.py)
</cite>

## Update Summary
**Changes Made**
- Enhanced documentation to reflect the new comprehensive Template Builder system with V2 data structures
- Updated template management system to include sophisticated preset generation, template normalization, and collaborative editing features
- Added detailed coverage of the new template editor interface with real-time validation, JSON preview, and enhanced preset system
- Enhanced template sanitization and validation with automatic content normalization and improved error handling
- Updated API endpoints to include comprehensive master template CRUD operations with enhanced validation
- Enhanced data models documentation with new evaluation template relationships and improved validation
- Added comprehensive coverage of the new sanitize_template_content function and template normalization logic
- Integrated collaborative scoring features with judge assignment permissions and real-time validation
- Added support for master templates per modality with unique constraint enforcement
- Enhanced validation system with comprehensive template structure, permission, and content sanitization

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Template Management System](#template-management-system)
5. [Master Template System](#master-template-system)
6. [Template Editor Interface](#template-editor-interface)
7. [Template List Interface](#template-list-interface)
8. [Evaluation Workflow](#evaluation-workflow)
9. [Data Models and Relationships](#data-models-and-relationships)
10. [API Endpoints](#api-endpoints)
11. [Implementation Details](#implementation-details)
12. [Performance Considerations](#performance-considerations)
13. [Troubleshooting Guide](#troubleshooting-guide)
14. [Conclusion](#conclusion)

## Introduction

The Evaluation Template Management system is a comprehensive solution for managing scoring templates and evaluation workflows in automotive audio and tuning competitions. The system provides a sophisticated master template architecture with modalidad-based template management, advanced V2 scoring interface, real-time preview capabilities, and collaborative evaluation workflows.

The platform supports five official modalities (SPL, SQ, SQL, Street Show, Tuning) with specialized evaluation criteria, automated scoring calculations, and hierarchical category management. Each modalidad maintains a single shared master template that all judges can access, enabling consistent evaluation standards across different competition formats. The enhanced master template system introduces comprehensive template validation, normalization, and collaborative editing capabilities with sophisticated preset generation and real-time preview functionality.

The system now includes enhanced template sanitization with automatic content normalization, improved error handling throughout the validation pipeline, and comprehensive support for V2 scoring interface with new categorization options and enhanced template validation. The addition of the ScoreCard model enables automated scoring calculations and collaborative evaluation workflows with real-time score tracking and category assignment.

## System Architecture

The system follows a modern full-stack architecture with clear separation between frontend, backend, and database layers:

```mermaid
graph TB
subgraph "Frontend Layer"
FE1[React Admin Interface]
FE2[Master Template Editor V2]
FE3[Template List Manager]
FE4[Real-time JSON Preview]
FE5[Judge Interface]
FE6[Collaborative Editing]
FE7[Template Builder Components]
end
subgraph "API Layer"
API1[FastAPI Backend]
API2[Authentication]
API3[Authorization]
API4[Template Validation V2]
API5[Template Sanitization]
API6[ScoreCard Management]
end
subgraph "Business Logic"
BL1[Template Management]
BL2[Scoring Engine V2]
BL3[Category Resolution]
BL4[Results Processing]
BL5[Judge Assignment Management]
BL6[Template Normalization]
BL7[Automated Scoring]
end
subgraph "Data Layer"
DB1[SQLite Database]
DB2[Tables: Evaluation Templates, Judge Assignments, Score Cards]
DB3[JSON Storage]
DB4[Template Validation Rules]
end
FE1 --> API1
FE2 --> API1
FE3 --> API1
FE4 --> API1
FE5 --> API1
FE6 --> API1
FE7 --> API1
API1 --> BL1
API1 --> BL2
API1 --> BL3
API1 --> BL4
API1 --> BL5
API1 --> BL6
API1 --> BL7
BL1 --> DB1
BL2 --> DB1
BL3 --> DB1
BL4 --> DB1
BL5 --> DB1
BL6 --> DB4
BL7 --> DB1
```

**Diagram sources**
- [main.py:26-44](file://main.py#L26-L44)
- [routes/evaluation_templates.py:14-172](file://routes/evaluation_templates.py#L14-L172)
- [routes/modalities.py:15-180](file://routes/modalities.py#L15-L180)
- [routes/scorecards.py:20-725](file://routes/scorecards.py#L20-L725)

## Core Components

### Backend Services

The backend consists of several specialized routers handling different aspects of the evaluation system:

**Master Template Router**: Handles CRUD operations for master templates with comprehensive validation, modalidad assignment, and uniqueness constraints. Now includes advanced sanitization and normalization functions for template content with enhanced error handling and V2 scoring interface support.

**Modality Router**: Manages modalidad definitions, category hierarchies, and judge assignment permissions with enhanced validation and cascading operations.

**Scoring Router**: Implements the collaborative evaluation workflow with partial updates, finalization, and category assignment with improved permission checking, V2 scoring interface, and validation. Now includes comprehensive ScoreCard management with automated calculations and real-time score tracking.

**Authentication & Authorization**: Ensures only authorized users (admins and judges) can access specific endpoints with role-based permissions and enhanced security checks.

### Frontend Interfaces

**Admin Dashboard**: Central management interface for template creation, editing, and monitoring with real-time validation feedback and comprehensive template statistics.

**Master Template Editor V2**: Advanced JSON editor with real-time validation, template presets, comprehensive CRUD operations, and sophisticated template normalization capabilities with enhanced bonification section support and V2 data structures.

**Template List Manager**: Grid-based interface for browsing, previewing, and managing all master templates with statistical summaries, template analytics, and bulk operations.

**Real-time Preview**: Modal-based JSON preview with syntax highlighting, copy functionality, and template validation feedback.

**Judge Interface**: Specialized interface for judges to evaluate participants using master templates with role-based access control, V2 scoring interface, and collaborative editing permissions.

**Template Builder Components**: Modular component system including TemplateSectionCard, TemplateItemCard, CategorizationOptionRow, BonificationSection, and JsonPreview for building comprehensive evaluation templates.

**Section sources**
- [routes/evaluation_templates.py:14-172](file://routes/evaluation_templates.py#L14-L172)
- [routes/modalities.py:15-180](file://routes/modalities.py#L15-L180)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:546-800](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L546-L800)
- [frontend/src/pages/admin/TemplatesList.tsx:73-252](file://frontend/src/pages/admin/TemplatesList.tsx#L73-L252)
- [frontend/src/components/template-editor/index.ts:1-8](file://frontend/src/components/template-editor/index.ts#L1-L8)

## Template Management System

The system supports a sophisticated master template architecture with comprehensive validation and management capabilities:

### Master Template Structure

Master templates use a hierarchical JSON structure that defines evaluation criteria, scoring scales, and categorization logic with enhanced validation and normalization:

```mermaid
classDiagram
class EvaluationTemplateMaster {
+string template_name
+string modality
+string version
+Record~string,string~ evaluation_scale
+TemplateSectionV2[] sections
+BonificationItemV2[] bonifications
}
class TemplateSectionV2 {
+string section_id
+string section_title
+string assigned_role
+TemplateItemV2[] items
}
class TemplateItemV2 {
+string item_id
+string label
+string evaluation_type
+number max_score
+CategorizationOption[] categorization_options
}
class CategorizationOption {
+string label
+number triggers_level
+number category_id
+string category_name
}
class BonificationItemV2 {
+string item_id
+string label
+number max_score
}
EvaluationTemplateMaster --> TemplateSectionV2 : "contains"
TemplateSectionV2 --> TemplateItemV2 : "contains"
TemplateItemV2 --> CategorizationOption : "uses"
EvaluationTemplateMaster --> BonificationItemV2 : "contains"
```

**Diagram sources**
- [frontend/src/lib/judging.ts:40-84](file://frontend/src/lib/judging.ts#L40-L84)
- [frontend/src/lib/judging.ts:66-84](file://frontend/src/lib/judging.ts#L66-L84)

### Template Validation System

The system implements comprehensive validation for template integrity and consistency with advanced sanitization and normalization:

```mermaid
flowchart TD
Start([Template Creation/Edit]) --> LoadDefaults["Load Default Template<br/>- Evaluation Scale<br/>- Basic Sections"]
LoadDefaults --> ValidateStructure["Validate JSON Structure<br/>- Required Fields<br/>- Data Types<br/>- Constraints"]
ValidateStructure --> NormalizeContent["Normalize Template Content<br/>- Sanitize IDs<br/>- Set Defaults<br/>- Fix Inconsistencies"]
NormalizeContent --> ValidatePermissions["Validate Judge Permissions<br/>- Assigned Roles<br/>- Section Access<br/>- Principal Judge Rights"]
ValidatePermissions --> ValidateCategories["Validate Categorization Options<br/>- Trigger Levels<br/>- Option Labels<br/>- Consistency Checks"]
ValidateCategories --> ValidateScores["Validate Scoring Scales<br/>- Max Scores<br/>- Evaluation Types<br/>- Point Distribution"]
ValidateScores --> SanitizeContent["Sanitize Template Content<br/>- Modality Assignment<br/>- Bonification Normalization<br/>- Role Validation"]
SanitizeContent --> StoreTemplate["Store in Database<br/>- Unique Modality Constraint<br/>- JSON Validation<br/>- Audit Trail"]
StoreTemplate --> End([Template Ready])
```

**Diagram sources**
- [routes/evaluation_templates.py:17-29](file://routes/evaluation_templates.py#L17-L29)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:387-483](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L387-L483)

**Section sources**
- [routes/evaluation_templates.py:17-29](file://routes/evaluation_templates.py#L17-L29)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:387-483](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L387-L483)

## Master Template System

The master template system represents the most sophisticated approach to evaluation management with comprehensive validation and collaborative features:

### Template Editor Interface

The master template editor provides a comprehensive interface for creating and managing evaluation templates with advanced preset generation and real-time validation:

```mermaid
graph LR
subgraph "Template Editor Interface V2"
TE1[Modalidad Selector]
TE2[Version Input]
TE3[Template Name Input]
TE4[Preset Generator]
TE5[Section Management]
TE6[Item Editor]
TE7[Option Manager]
TE8[JSON Preview]
TE9[Validation Feedback]
TE10[Save Operations]
end
subgraph "Template Structure V2"
TS1[Sections Array]
TS2[Items Array]
TS3[Categorization Options]
TS4[Bonification Items]
TS5[Validation Rules]
end
TE1 --> TS1
TE2 --> TS1
TE3 --> TS1
TE4 --> TS1
TE5 --> TS1
TE6 --> TS2
TE7 --> TS3
TE8 --> TS4
TE9 --> TS5
TE10 --> TS1
```

**Diagram sources**
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:695-800](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L695-L800)

### Collaborative Template Management

The system supports collaborative template management with role-based access control and enhanced permission enforcement:

```mermaid
sequenceDiagram
participant Admin as Admin User
participant Editor as Template Editor V2
participant API as Master Template API
participant DB as Database
participant Judge as Judge User
Admin->>Editor : Open Template Editor
Editor->>API : Load Template Context
API->>DB : Fetch Modalities & Template
DB-->>API : Return Data
API-->>Editor : Template Content
Editor->>Editor : Real-time Validation
Editor->>API : Save Template
API->>DB : Validate & Store
DB-->>API : Success/Failure
API-->>Editor : Response
Editor->>Judge : Template Access
Judge->>API : Access Template
API->>DB : Check Permissions
DB-->>API : Permission Details
API-->>Judge : Template with Restrictions
```

**Diagram sources**
- [routes/evaluation_templates.py:56-100](file://routes/evaluation_templates.py#L56-L100)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:508-532](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L508-L532)

**Section sources**
- [routes/evaluation_templates.py:56-100](file://routes/evaluation_templates.py#L56-L100)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:508-532](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L508-L532)

## Template Editor Interface

The Master Template Editor V2 provides a comprehensive interface for creating and managing evaluation templates with real-time validation and advanced preset generation:

### User Interface Components

The editor interface includes sophisticated validation and management features with enhanced template building capabilities:

**Template Structure Management**: Dynamic section and item management with drag-and-drop capabilities, real-time validation feedback, and intelligent preset generation.

**JSON Validation System**: Real-time JSON validation with syntax highlighting, error detection, automatic correction suggestions, and comprehensive template normalization.

**Preset System**: Modalidad-specific presets with automatic template generation, customization options, and intelligent content population.

**Permission Management**: Role-based access control with judge assignment validation, permission enforcement, and collaborative editing restrictions.

**Template Builder Components**: Modular component system including TemplateSectionCard, TemplateItemCard, CategorizationOptionRow, BonificationSection, and JsonPreview for building comprehensive evaluation templates.

**Section sources**
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:695-800](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L695-L800)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:508-532](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L508-L532)
- [frontend/src/components/template-editor/index.ts:1-8](file://frontend/src/components/template-editor/index.ts#L1-L8)

### Validation Logic

The editor implements comprehensive validation to ensure template integrity with advanced sanitization:

| Validation Type | Rules | Purpose |
|----------------|-------|---------|
| Template Structure | JSON schema validation, required fields, data types | Prevent malformed templates |
| Modalidad Assignment | Unique constraint per modalidad, role validation | Prevent template conflicts |
| Section Management | Unique section IDs, valid role assignments | Maintain template organization |
| Item Validation | Score ranges, evaluation types, option consistency | Ensure scoring accuracy |
| Permission Control | Judge assignment verification, access restrictions | Maintain evaluation integrity |
| Content Sanitization | ID normalization, default values, consistency checks | Ensure template quality |

**Section sources**
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:387-483](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L387-L483)
- [routes/evaluation_templates.py:17-29](file://routes/evaluation_templates.py#L17-L29)

## Template List Interface

The Template List Manager provides a comprehensive overview of all master templates with statistical analysis and quick access:

### Template Overview System

The list interface displays comprehensive template information with advanced analytics:

```mermaid
graph TD
subgraph "Template Card Layout"
TC1[Modalidad Badge]
TC2[Template Name]
TC3[Version Info]
TC4[Statistics Panel]
TC5[Action Buttons]
end
subgraph "Statistics Display"
SD1[Section Count]
SD2[Item Count]
SD3[Reference Points]
SD4[Template Quality Score]
end
subgraph "Actions"
A1[JSON Preview]
A2[Edit Template]
A3[Create Duplicate]
A4[Export Template]
A5[Template Analytics]
end
TC4 --> SD1
TC4 --> SD2
TC4 --> SD3
TC4 --> SD4
TC5 --> A1
TC5 --> A2
TC5 --> A3
TC5 --> A4
TC5 --> A5
```

**Diagram sources**
- [frontend/src/pages/admin/TemplatesList.tsx:154-224](file://frontend/src/pages/admin/TemplatesList.tsx#L154-L224)

### Statistical Analysis

The system provides comprehensive template analytics with quality metrics:

**Template Statistics**: Automatic calculation of sections, items, and reference point totals for each template with quality scoring.

**Usage Analytics**: Template popularity metrics, judge assignment counts, and evaluation frequency tracking.

**Version Management**: Template version tracking, comparison capabilities, and historical analysis.

**Quality Assessment**: Template completeness scores, validation status indicators, and recommendation system.

**Section sources**
- [frontend/src/pages/admin/TemplatesList.tsx:73-252](file://frontend/src/pages/admin/TemplatesList.tsx#L73-L252)

## Evaluation Workflow

The evaluation process integrates seamlessly with the master template management system and collaborative judge assignments:

### Judge Assignment Workflow

```mermaid
flowchart TD
Start([Judge Assignment Process]) --> LoadAssignments["Load Judge Assignments"]
LoadAssignments --> FilterByModality["Filter by Selected Modality"]
FilterByModality --> CheckPermissions["Check Section Permissions"]
CheckPermissions --> HasAccess{"Has Access to Section?"}
HasAccess --> |Yes| AllowEdit["Allow Template Editing"]
HasAccess --> |No| DenyEdit["Deny Access"]
AllowEdit --> ValidateTemplate["Validate Template Structure"]
ValidateTemplate --> LoadTemplate["Load Master Template"]
LoadTemplate --> InitializeScorecard["Initialize Score Card"]
InitializeScorecard --> UpdateAnswers["Update Evaluation Answers"]
UpdateAnswers --> ValidateAnswers["Validate Answers Against Template"]
ValidateAnswers --> CalculateScore["Calculate Total Score"]
CalculateScore --> UpdateLevel["Update Category Level"]
UpdateLevel --> FinalizeCard["Finalize Evaluation Card"]
FinalizeCard --> End([Evaluation Complete])
DenyEdit --> End
```

**Diagram sources**
- [routes/scorecards.py:445-503](file://routes/scorecards.py#L445-L503)
- [routes/scorecards.py:535-607](file://routes/scorecards.py#L535-L607)

### Automated Scoring System

The system automatically calculates scores based on master template definitions with enhanced validation:

```mermaid
classDiagram
class ScoringEngine {
+calculateTotal(answers, template) float
+validateAnswers(answers, template) bool
+calculateLevel(answers, template) int
+applyBonuses(answers, template) float
}
class TemplateValidator {
+validateItemPermissions(assignment, template, answers) void
+checkMissingItems(expected, actual) string[]
+verifyAnswerTypes(answers, template) bool
}
class CategoryResolver {
+resolveByLevel(modality, level) Category
+normalizeCategoryName(name) string
+findFallbackCategory(modality, level) Category
}
class JudgeAssignmentManager {
+checkAssignment(user_id, modality_id) JudgeAssignment
+validatePermissions(assignment, item_id) bool
+enforceRoleRestrictions(assignment) set~string~
}
ScoringEngine --> TemplateValidator : "uses"
ScoringEngine --> CategoryResolver : "uses"
JudgeAssignmentManager --> TemplateValidator : "enforces"
```

**Diagram sources**
- [routes/scorecards.py:318-353](file://routes/scorecards.py#L318-L353)
- [routes/scorecards.py:144-174](file://routes/scorecards.py#L144-L174)

**Section sources**
- [routes/scorecards.py:535-607](file://routes/scorecards.py#L535-L607)
- [routes/scorecards.py:318-353](file://routes/scorecards.py#L318-L353)

## Data Models and Relationships

The system's data architecture supports complex evaluation scenarios through carefully designed relationships with enhanced validation:

### Core Entity Relationships

```mermaid
erDiagram
MODALITY {
int id PK
string nombre UK
}
EVALUATION_TEMPLATE {
int id PK
int modality_id FK
json content
}
JUDGE_ASSIGNMENT {
int id PK
int user_id FK
int modality_id FK
json assigned_sections
boolean is_principal
unique user_modality
}
SCORE_CARD {
int id PK
int participant_id UK
int template_id FK
json answers
string status
int calculated_level
float total_score
}
PARTICIPANT {
int id PK
int category_id FK
string modalidad
string categoria
string nombres_apellidos
string marca_modelo
string placa_rodaje
}
USER {
int id PK
string username UK
string role
boolean can_edit_scores
}
MODALITY ||--o{ EVALUATION_TEMPLATE : "has"
MODALITY ||--o{ JUDGE_ASSIGNMENT : "has"
EVALUATION_TEMPLATE ||--o{ SCORE_CARD : "defines"
PARTICIPANT ||--|| SCORE_CARD : "evaluated_by"
USER ||--o{ JUDGE_ASSIGNMENT : "assigned_to"
USER ||--o{ SCORE : "submits"
```

**Diagram sources**
- [models.py:115-163](file://models.py#L115-L163)
- [models.py:174-225](file://models.py#L174-L225)

### Template Data Structures

The system supports sophisticated template formats optimized for different use cases with enhanced validation:

| Template Type | Storage Format | Use Case | Complexity | Validation |
|---------------|----------------|----------|------------|------------|
| Master Template | Hierarchical JSON | Complex multi-section evaluations | High | Comprehensive |
| Judge Assignment | JSON Array | Role-based permissions | Medium | Role-based |
| Score Card | JSON Object | Individual judge evaluations | Medium-High | Real-time |
| Category Definition | JSON Object | Evaluation categories | Low | Simple |

**Section sources**
- [models.py:115-163](file://models.py#L115-L163)
- [schemas.py:180-236](file://schemas.py#L180-L236)

## API Endpoints

The system exposes a comprehensive REST API for master template management with enhanced validation:

### Master Template Management Endpoints

| Endpoint | Method | Description | Authentication | Validation |
|----------|--------|-------------|----------------|------------|
| `/api/evaluation-templates` | GET | List all master templates | User | None |
| `/api/evaluation-templates` | POST | Create master template | Admin | Full validation, sanitization |
| `/api/evaluation-templates/{id}` | GET | Get master template | User | None |
| `/api/evaluation-templates/by-modality/{modality_id}` | GET | Get template by modality | User | None |
| `/api/evaluation-templates/{id}` | PUT | Update master template | Admin | Full validation, sanitization |
| `/api/evaluation-templates/{id}` | DELETE | Delete master template | Admin | Cascade delete |

### Template Management Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/modalities` | GET | List all modalities | User |
| `/api/modalities` | POST | Create modality | Admin |
| `/api/modalities/{modality_id}` | DELETE | Delete modality | Admin |

### Evaluation Workflow Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/scorecards` | GET | List scorecards | User |
| `/api/scorecards/{participant_id}/partial-update` | PATCH | Partial scorecard update | Judge |
| `/api/scorecards/{participant_id}` | GET | Get scorecard | Judge |
| `/api/scorecards/{participant_id}/finalize` | POST | Finalize scorecard | Principal Judge |

**Section sources**
- [routes/evaluation_templates.py:42-172](file://routes/evaluation_templates.py#L42-L172)
- [routes/modalities.py:18-52](file://routes/modalities.py#L18-L52)
- [routes/scorecards.py:422-400](file://routes/scorecards.py#L422-L400)

## Implementation Details

### Database Schema Design

The database schema supports the sophisticated master template architecture with enhanced validation:

**Master Template Storage**: Single template per modalidad with comprehensive JSON storage, validation, and normalization.

**Judge Assignment Management**: Role-based access control with section-level permissions, principal judge designation, and enhanced permission enforcement.

**Score Card Integration**: Direct linking between participants, templates, and evaluation results with automatic calculation and validation.

**Template Validation**: Built-in validation rules, normalization functions, and quality assurance for template integrity.

### Security Implementation

The system implements comprehensive security measures with enhanced validation:

**Authentication**: JWT-based authentication with role-based access control and enhanced security checks.

**Authorization**: Per-endpoint permission checking with user role validation and template access restrictions.

**Template Access Control**: Judge assignments determine which evaluation sections they can access with enhanced permission enforcement.

**Data Validation**: Comprehensive input validation prevents malicious data injection and ensures template quality.

**Template Integrity**: Unique constraints prevent duplicate templates per modalidad with enhanced validation.

### Error Handling

Robust error handling ensures system stability with comprehensive validation:

**HTTP Status Codes**: Proper HTTP status codes for different error scenarios with enhanced error messages.

**Validation Errors**: Specific error messages for template validation failures with actionable guidance.

**Database Errors**: Graceful handling of database connectivity issues with retry mechanisms.

**Permission Errors**: Clear error messages for unauthorized access attempts with role-based explanations.

**Template Sanitization**: Automatic cleanup and normalization of template content prevents corruption.

The system now includes comprehensive template sanitization with the `sanitize_template_content` function that automatically normalizes template content, assigns proper roles to bonification sections, and ensures consistent data structure across all templates.

**Section sources**
- [routes/evaluation_templates.py:56-100](file://routes/evaluation_templates.py#L56-L100)
- [routes/scorecards.py:144-174](file://routes/scorecards.py#L144-L174)

## Performance Considerations

### Database Optimization

**Indexing Strategy**: Strategic indexing on frequently queried fields (modalidad, user roles, template IDs) with enhanced performance.

**Query Optimization**: Efficient queries using joined loads to minimize database round trips with optimized joins.

**Connection Pooling**: Proper session management to handle concurrent requests with connection pooling.

### Frontend Performance

**Component Optimization**: React.memo for template components to reduce re-renders with enhanced memoization.

**State Management**: Efficient state updates to minimize re-renders with optimized state management.

**API Caching**: Client-side caching for frequently accessed templates and modalities with intelligent caching.

**Real-time Validation**: Debounced validation to prevent excessive API calls with enhanced throttling.

### Scalability Features

**Horizontal Scaling**: Stateless API design supports load balancing with enhanced scalability.

**Template Versioning**: Support for template versioning to maintain backward compatibility with enhanced version control.

**Judge Assignment Caching**: Cached assignment data reduces database queries with intelligent caching strategies.

**Template Preloading**: Master templates preloaded for active modalities with enhanced preloading strategies.

## Troubleshooting Guide

### Common Issues and Solutions

**Template Not Found Errors**: Verify template exists for the requested modality and user has access rights with enhanced error messages.

**Permission Denied**: Check judge assignments and section permissions for the requesting user with detailed permission information.

**Template Validation Failures**: Review template JSON against validation rules and fix structural issues with comprehensive error reporting.

**Scoring Calculation Issues**: Verify template definitions and ensure all required items are included with detailed calculation logs.

**Database Migration Errors**: Run database migration script to update schema for new features with enhanced migration support.

**Template Sanitization Issues**: Check template content for malformed structures and ensure proper JSON formatting with enhanced validation feedback.

### Debugging Tools

**API Testing**: Use curl commands or Postman to test API endpoints independently with enhanced testing tools.

**Template Validation**: Use the built-in JSON validation to identify structural issues with comprehensive validation reports.

**Frontend Debugging**: Browser developer tools for client-side debugging with enhanced debugging capabilities.

**Template Preview**: Use the JSON preview modal to inspect template structure with syntax highlighting.

**Logging**: Enable detailed logging for error tracking and performance monitoring with enhanced logging.

### Performance Monitoring

**Response Time Tracking**: Monitor API response times for optimization opportunities with enhanced monitoring.

**Database Query Analysis**: Identify slow queries and optimize indexing with comprehensive query analysis.

**Memory Usage**: Monitor memory consumption for long-running processes with enhanced memory profiling.

**Template Load Times**: Track template loading performance for optimization with detailed performance metrics.

**Section sources**
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/pages/admin/EvaluationTemplateEditor.tsx:608-658](file://frontend/src/pages/admin/EvaluationTemplateEditor.tsx#L608-L658)

## Conclusion

The Evaluation Template Management system provides a robust, scalable solution for organizing and conducting automotive audio and tuning competitions. Its sophisticated master template architecture with modalidad-based management, comprehensive validation system, and collaborative evaluation workflows ensures consistency and reliability across all competition formats.

Key strengths include:

**Advanced Validation**: Comprehensive template validation with real-time feedback, normalization, and sanitization capabilities.

**Collaborative Management**: Role-based access control with judge assignment permissions, collaborative editing, and enhanced permission enforcement.

**Flexible Architecture**: Support for multiple modalidades with specialized evaluation criteria, automated scoring, and template preset generation.

**Comprehensive Tooling**: Real-time preview, statistical analysis, template management, and quality assessment capabilities.

**Security**: Robust authorization, validation, and sanitization systems protecting template integrity and user data.

**Scalability**: Well-designed architecture supporting growth, maintenance, and adaptation across multiple competition formats.

Sophisticated editor interface, template builder, preset generation, and collaborative editing features.

Advanced sanitization with automatic content normalization, improved error handling, and comprehensive bonification section support.

Enhanced V2 Scoring Interface with sophisticated scoring interface with new categorization support, improved template validation, and enhanced collaborative editing capabilities.

Enhanced ScoreCard System with comprehensive evaluation tracking with automated scoring calculations, real-time score updates, and collaborative judge assignments.

The system's modular design, comprehensive documentation, and advanced template management capabilities make it suitable for adaptation to various competition formats and requirements, ensuring long-term maintainability and extensibility with continuous improvement and enhanced functionality.