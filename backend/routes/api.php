<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AssessmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompetencyController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProgramController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TraineeController;
use App\Http\Controllers\Api\TraineePortalController;
use App\Http\Controllers\Api\TrainingSessionController;
use App\Http\Controllers\Api\UserController;

Route::prefix('v1')->group(function () {

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1');

    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,1');

    Route::post('/auth/google', [AuthController::class, 'google'])
        ->middleware('throttle:10,1');

    Route::middleware([
        'auth:sanctum',
        'active',
        \Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
    ])->group(function () {

        Route::get('/user', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);

        // Own profile
        Route::get('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'show']);
        Route::post('/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
        Route::delete('/profile/photo', [\App\Http\Controllers\Api\ProfileController::class, 'destroyPhoto']);

        // Authenticated users may view identification avatars
        Route::get('/users/{user}/avatar', [\App\Http\Controllers\Api\ProfileController::class, 'avatar']);

        // Personal
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index'])
            ->middleware('permission:dashboard.view');

        // Shared lookups
        Route::get('/lookups/users', [\App\Http\Controllers\Api\LookupController::class, 'users']);
        Route::get('/lookups/roles', [\App\Http\Controllers\Api\LookupController::class, 'roles']);
        Route::get('/lookups/modules', [\App\Http\Controllers\Api\LookupController::class, 'modules']);
        Route::get('/lookups/phases', [\App\Http\Controllers\Api\LookupController::class, 'phases']);
        Route::get('/lookups/programs', [\App\Http\Controllers\Api\LookupController::class, 'programs']);
        Route::get('/lookups/competencies', [\App\Http\Controllers\Api\LookupController::class, 'competencies']);

        // Trainees
        Route::middleware('permission:trainees.view')->group(function () {
            Route::get('/trainees', [TraineeController::class, 'index']);
            Route::get('/trainees/summary', [TraineeController::class, 'summary']);
            Route::get('/trainees/{trainee}', [TraineeController::class, 'show']);
            Route::get('/trainees/{trainee}/documents/{document}/download', [TraineeController::class, 'downloadDocument']);
        });
        Route::middleware('permission:trainees.create')->post('/trainees', [TraineeController::class, 'store']);
        Route::middleware('permission:trainees.update')->group(function () {
            Route::put('/trainees/{trainee}', [TraineeController::class, 'update']);
            Route::post('/trainees/{trainee}/documents', [TraineeController::class, 'uploadDocument']);
            Route::delete('/trainees/{trainee}/documents/{document}', [TraineeController::class, 'deleteDocument']);
            Route::post('/trainees/{trainee}/enrollments/{enrollment}/modules/{module}/toggle', [TraineeController::class, 'toggleModule']);
        });
        Route::middleware('permission:trainees.archive')->delete('/trainees/{trainee}', [TraineeController::class, 'archive']);

        // Programs
        Route::middleware('permission:programs.view')->group(function () {
            Route::get('/programs', [ProgramController::class, 'index']);
            Route::get('/programs/summary', [ProgramController::class, 'summary']);
            Route::get('/programs/{program}', [ProgramController::class, 'show']);
            Route::get('/programs/{program}/curriculum', [CurriculumController::class, 'show']);
        });
        Route::middleware('permission:programs.create')->post('/programs', [ProgramController::class, 'store']);
        Route::middleware('permission:programs.update')->group(function () {
            Route::put('/programs/{program}', [ProgramController::class, 'update']);
            Route::delete('/programs/{program}', [ProgramController::class, 'archive']);
        });

        // Curriculum
        Route::middleware('permission:curriculum.manage')->group(function () {
            Route::post('/programs/{program}/versions', [CurriculumController::class, 'storeVersion']);
            Route::put('/curriculum-versions/{version}', [CurriculumController::class, 'updateVersion']);
            Route::post('/curriculum-versions/{version}/publish', [CurriculumController::class, 'publishVersion']);
            Route::post('/curriculum-versions/{version}/phases', [CurriculumController::class, 'storePhase']);
            Route::put('/curriculum-phases/{phase}', [CurriculumController::class, 'updatePhase']);
            Route::delete('/curriculum-phases/{phase}', [CurriculumController::class, 'destroyPhase']);
            Route::post('/curriculum-versions/{version}/phases/reorder', [CurriculumController::class, 'reorderPhases']);
            Route::post('/curriculum-phases/{phase}/modules', [CurriculumController::class, 'storeModule']);
            Route::put('/training-modules/{module}', [CurriculumController::class, 'updateModule']);
            Route::delete('/training-modules/{module}', [CurriculumController::class, 'destroyModule']);
            Route::post('/training-modules/{module}/competencies', [CurriculumController::class, 'storeCompetency']);
            Route::put('/module-competencies/{competency}', [CurriculumController::class, 'updateCompetency']);
            Route::delete('/module-competencies/{competency}', [CurriculumController::class, 'destroyCompetency']);
        });

        // Materials
        Route::middleware('permission:materials.view')->group(function () {
            Route::get('/materials', [MaterialController::class, 'index']);
            Route::get('/materials/summary', [MaterialController::class, 'summary']);
            Route::get('/materials/{material}/download', [MaterialController::class, 'download']);
        });
        Route::middleware('permission:materials.manage')->group(function () {
            Route::post('/materials', [MaterialController::class, 'store']);
            Route::post('/materials/{material}', [MaterialController::class, 'update']);
            Route::delete('/materials/{material}', [MaterialController::class, 'archive']);
        });

        // Sessions
        Route::middleware('permission:sessions.view')->group(function () {
            Route::get('/sessions', [TrainingSessionController::class, 'index']);
            Route::get('/sessions/summary', [TrainingSessionController::class, 'summary']);
            Route::get('/sessions/{session}', [TrainingSessionController::class, 'show']);
            Route::get('/sessions/{session}/attendance', [AttendanceController::class, 'sheet']);
        });
        Route::middleware('permission:sessions.manage')->group(function () {
            Route::post('/sessions', [TrainingSessionController::class, 'store']);
            Route::put('/sessions/{session}', [TrainingSessionController::class, 'update']);
            Route::post('/sessions/{session}/cancel', [TrainingSessionController::class, 'cancel']);
            Route::post('/sessions/{session}/complete', [TrainingSessionController::class, 'complete']);
            Route::put('/sessions/{session}/attendance', [AttendanceController::class, 'saveSheet']);
        });

        // Attendance
        Route::middleware('permission:attendance.view')->group(function () {
            Route::get('/attendance', [AttendanceController::class, 'index']);
            Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
        });
        Route::middleware('permission:attendance.manage')->put('/attendance/{attendance}', [AttendanceController::class, 'update']);

        // Assessments
        Route::middleware('permission:assessments.view')->get('/assessments/summary', [AssessmentController::class, 'summary']);
        Route::middleware('permission:assessments.view')->group(function () {
            Route::get('/assessments', [AssessmentController::class, 'index']);
            Route::get('/assessments/{assessment}', [AssessmentController::class, 'show']);
        });
        Route::middleware('permission:assessments.update')->group(function () {
            Route::put('/assessments/{assessment}', [AssessmentController::class, 'update']);
            Route::post('/assessments/{assessment}/publish', [AssessmentController::class, 'publish']);
            Route::post('/assessments/{assessment}/questions', [AssessmentController::class, 'storeQuestion']);
            Route::put('/assessment-questions/{question}', [AssessmentController::class, 'updateQuestion']);
            Route::delete('/assessment-questions/{question}', [AssessmentController::class, 'destroyQuestion']);
        });
        Route::middleware('permission:assessments.create')->post('/assessments', [AssessmentController::class, 'store']);
        Route::middleware('permission:assessments.manage')->delete('/assessments/{assessment}', [AssessmentController::class, 'destroy']);

        // Results
        Route::middleware('permission:assessments.results.view')->group(function () {
            Route::get('/assessment-attempts', [AssessmentController::class, 'attempts']);
            Route::get('/assessment-attempts/summary', [AssessmentController::class, 'summaryResults']);
            Route::get('/assessment-attempts/{attempt}', [AssessmentController::class, 'showAttempt']);
        });
        Route::middleware('permission:assessments.evaluate')->group(function () {
            Route::post('/assessment-attempts/{attempt}/grade', [AssessmentController::class, 'grade']);
            Route::post('/assessments/{assessment}/release', [AssessmentController::class, 'release']);
        });

        // Competencies
        Route::middleware('permission:competencies.view')->group(function () {
            Route::get('/competencies', [CompetencyController::class, 'index']);
            Route::get('/competencies/summary', [CompetencyController::class, 'summary']);
            Route::get('/competencies/categories', [CompetencyController::class, 'categories']);
            Route::get('/competency-evaluations', [CompetencyController::class, 'evaluations']);
            Route::get('/competency-evaluations/summary', [CompetencyController::class, 'evaluationSummary']);
        });
        Route::middleware('permission:competencies.evaluate')->post('/competency-evaluations', [CompetencyController::class, 'storeEvaluation']);
        Route::middleware('permission:competencies.validate')->post('/competency-evaluations/{evaluation}/validate', [CompetencyController::class, 'validateEvaluation']);

        // Progress
        Route::middleware('permission:progress.view')->group(function () {
            Route::get('/onboarding-progress', [ProgressController::class, 'index']);
            Route::get('/onboarding-progress/summary', [ProgressController::class, 'summary']);
            Route::get('/onboarding-progress/{enrollment}', [ProgressController::class, 'show']);
        });
        Route::middleware('permission:approvals.supervisor')->post('/onboarding-progress/{enrollment}/submit', [ProgressController::class, 'submit']);
        Route::middleware('permission:approvals.final')->group(function () {
            Route::post('/onboarding-progress/{enrollment}/approve', [ProgressController::class, 'approve']);
            Route::post('/onboarding-progress/{enrollment}/return', [ProgressController::class, 'returnForTraining']);
        });

        // Reports
        Route::prefix('reports')->middleware('permission:reports.view')->group(function () {
            Route::get('/dashboard', [ReportController::class, 'dashboard']);
            Route::get('/trainee-progress', [ReportController::class, 'traineeProgress']);
            Route::get('/attendance', [ReportController::class, 'attendance']);
            Route::get('/competencies', [ReportController::class, 'competencySummary']);
            Route::get('/overview', [ReportController::class, 'overview']);
            Route::get('/individual/{trainee}', [ReportController::class, 'individual']);
            Route::get('/program-performance', [ReportController::class, 'programPerformance']);
            Route::get('/completion', [ReportController::class, 'completion']);
            Route::get('/export', [ReportController::class, 'export']);
        });

        // Users
        Route::middleware('permission:users.view')->get('/users', [UserController::class, 'index']);
        Route::middleware('permission:users.create')->post('/users', [UserController::class, 'store']);
        Route::middleware('permission:users.update')->group(function () {
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
            Route::post('/users/{user}/photo', [\App\Http\Controllers\Api\ProfileController::class, 'updateUserPhoto']);
        });
        Route::middleware('permission:users.approve')->group(function () {
            Route::post('/users/{user}/approve', [UserController::class, 'approve']);
            Route::post('/users/{user}/reject', [UserController::class, 'reject']);
        });
        Route::middleware('permission:users.deactivate')->group(function () {
            Route::post('/users/{user}/activate', [UserController::class, 'activate']);
            Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate']);
        });
        Route::middleware('permission:users.delete')->delete('/users/{user}', [UserController::class, 'destroy']);

        // Roles and permissions
        Route::middleware('permission:roles.manage')->group(function () {
            Route::get('/roles', [RoleController::class, 'index']);
            Route::post('/roles', [RoleController::class, 'store']);
            Route::put('/roles/{role}', [RoleController::class, 'update']);
            Route::put('/roles/{role}/permissions', [RoleController::class, 'syncPermissions']);
            Route::get('/assignable-users', [RoleController::class, 'assignableUsers']);
        });

        // Audit logs
        Route::get('/audit-logs', [AuditLogController::class, 'index'])
            ->middleware('permission:audit_logs.view');

        // Settings
        Route::middleware('permission:settings.manage')->group(function () {
            Route::get('/settings', [SettingsController::class, 'index']);
            Route::put('/settings', [SettingsController::class, 'update']);
        });

        // Trainee portal (personal records)
        Route::prefix('my')->group(function () {
            Route::get('/dashboard', [TraineePortalController::class, 'dashboard']);
            Route::get('/program', [TraineePortalController::class, 'program']);
            Route::get('/materials', [TraineePortalController::class, 'materials']);
            Route::get('/schedule', [TraineePortalController::class, 'schedule']);
            Route::get('/assessments', [TraineePortalController::class, 'assessments']);
            Route::post('/assessments/{assessment}/attempts', [TraineePortalController::class, 'startAttempt']);
            Route::post('/assessment-attempts/{attempt}/submit', [TraineePortalController::class, 'submitAttempt']);
            Route::get('/competencies', [TraineePortalController::class, 'competencies']);
            Route::get('/attendance', [TraineePortalController::class, 'attendance']);
            Route::get('/history', [TraineePortalController::class, 'history']);
        });
    });
});
