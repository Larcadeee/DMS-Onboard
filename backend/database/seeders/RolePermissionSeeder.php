<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {

            $roles = [
                [
                    'name' => 'Admin / Section Head',
                    'slug' => 'admin_section_head',
                    'description' => 'Full system administration, operational oversight, training authority and final onboarding approval.',
                ],
                [
                    'name' => 'Training Supervisor',
                    'slug' => 'training_supervisor',
                    'description' => 'Manages onboarding operations, training activities, evaluations and first-level approval.',
                ],
                [
                    'name' => 'Trainer / Evaluator',
                    'slug' => 'trainer_evaluator',
                    'description' => 'Conducts training sessions, records attendance, evaluates assessments and competencies for assigned trainees.',
                ],
                [
                    'name' => 'ETC / Trainee',
                    'slug' => 'etc_trainee',
                    'description' => 'Accesses assigned training activities, materials, assessments and personal progress records.',
                ],
            ];

            foreach ($roles as $role) {
                DB::table('roles')->updateOrInsert(
                    ['slug' => $role['slug']],
                    array_merge($role, [
                        'is_active' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ])
                );
            }

            
$permissions = [
    'dashboard.view' => 'View Dashboard',

    // Users and Roles
    'users.view' => 'View Users',
    'users.create' => 'Create Users',
    'users.update' => 'Update Users',
    'users.deactivate' => 'Deactivate Users',
    'roles.manage' => 'Manage Roles and Permissions',

    // Trainees
    'trainees.view' => 'View Trainees',
    'trainees.create' => 'Create Trainees',
    'trainees.update' => 'Update Trainees',
    'trainees.archive' => 'Archive Trainees',

    // Programs
    'programs.view' => 'View Programs',
    'programs.create' => 'Create Programs',
    'programs.update' => 'Update Programs',
    'programs.delete' => 'Delete Programs',
    'programs.manage' => 'Manage Programs',

    // Curriculum
    'curriculum.view' => 'View Curriculum',
    'curriculum.create' => 'Create Curriculum',
    'curriculum.update' => 'Update Curriculum',
    'curriculum.publish' => 'Publish Curriculum',
    'curriculum.manage' => 'Manage Curriculum Versions',

    // Training Materials
    'materials.view' => 'View Training Materials',
    'materials.manage' => 'Manage Training Materials',

    // Enrollments
    'enrollments.view' => 'View Enrollments',
    'enrollments.create' => 'Create Enrollments',
    'enrollments.update' => 'Update Enrollments',

    // Sessions
    'sessions.view' => 'View Training Sessions',
    'sessions.create' => 'Create Training Sessions',
    'sessions.update' => 'Update Training Sessions',
    'sessions.delete' => 'Delete Training Sessions',
    'sessions.manage' => 'Manage Training Sessions',

    // Attendance
    'attendance.view' => 'View Attendance',
    'attendance.create' => 'Create Attendance Records',
    'attendance.update' => 'Update Attendance Records',
    'attendance.manage' => 'Manage Attendance',

    // Assessments
    'assessments.view' => 'View Assessments',
    'assessments.create' => 'Create Assessments',
    'assessments.update' => 'Update Assessments',
    'assessments.manage' => 'Manage Assessments',
    'assessments.evaluate' => 'Evaluate Assessments',
    'assessments.results.view' => 'View Released Results',

    // Competencies
    'competencies.view' => 'View Competencies',
    'competencies.create' => 'Create Competencies',
    'competencies.update' => 'Update Competencies',
    'competencies.evaluate' => 'Evaluate Competencies',
    'competencies.validate' => 'Validate Competencies',

    // Evaluations
    'evaluations.view' => 'View Evaluations',
    'evaluations.create' => 'Create Evaluations',
    'evaluations.update' => 'Update Evaluations',

    // Progress and Approvals
    'progress.view' => 'View Onboarding Progress',
    'approvals.supervisor' => 'Approve Onboarding as Supervisor',
    'approvals.final' => 'Approve Final Onboarding Completion',

    // Reports
    'reports.view' => 'View Reports',
    'reports.export' => 'Export Reports',

    // System
    'audit_logs.view' => 'View Audit Logs',
    'settings.manage' => 'Manage System Settings',
];


            
$moduleMap = [
    'dashboard' => 'dashboard',
    'users' => 'users',
    'roles' => 'users',
    'trainees' => 'trainees',
    'programs' => 'programs',
    'curriculum' => 'programs',
    'materials' => 'training',
    'enrollments' => 'enrollments',
    'sessions' => 'training',
    'attendance' => 'attendance',
    'assessments' => 'assessments',
    'competencies' => 'competencies',
    'evaluations' => 'evaluations',
    'progress' => 'progress',
    'approvals' => 'approvals',
    'reports' => 'reports',
    'audit_logs' => 'audit',
    'settings' => 'settings',
];


            foreach ($permissions as $slug => $name) {
                $prefix = explode('.', $slug)[0];

                DB::table('permissions')->updateOrInsert(
                    ['slug' => $slug],
                    [
                        'name' => $name,
                        'module' => $moduleMap[$prefix] ?? 'general',
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            $allPermissions = DB::table('permissions')
                ->pluck('id', 'slug');

            $adminPermissions = array_keys($permissions);

            $supervisorPermissions = [
                'dashboard.view',
                'trainees.view',
                'trainees.create',
                'trainees.update',
                'programs.view',
                'curriculum.manage',
                'materials.view',
                'materials.manage',
                'sessions.view',
                'sessions.manage',
                'attendance.view',
                'attendance.manage',
                'assessments.view',
                'assessments.manage',
                'assessments.evaluate',
                'assessments.results.view',
                'competencies.view',
                'competencies.evaluate',
                'competencies.validate',
                'progress.view',
                'approvals.supervisor',
                'reports.view',
                'reports.export',
            ];

            $trainerPermissions = [
                'dashboard.view',
                'trainees.view',
                'trainees.update',
                'programs.view',
                'curriculum.view',
                'materials.view',
                'materials.manage',
                'sessions.view',
                'sessions.manage',
                'attendance.view',
                'attendance.manage',
                'assessments.view',
                'assessments.manage',
                'assessments.evaluate',
                'assessments.results.view',
                'competencies.view',
                'competencies.evaluate',
                'progress.view',
                'reports.view',
            ];

            $traineePermissions = [
                'dashboard.view',
                'programs.view',
                'materials.view',
                'sessions.view',
                'attendance.view',
                'assessments.view',
                'assessments.results.view',
                'competencies.view',
                'progress.view',
            ];

            $rolePermissions = [
                'admin_section_head' => $adminPermissions,
                'training_supervisor' => $supervisorPermissions,
                'trainer_evaluator' => $trainerPermissions,
                'etc_trainee' => $traineePermissions,
            ];

            foreach ($rolePermissions as $roleSlug => $permissionSlugs) {
                $roleId = DB::table('roles')
                    ->where('slug', $roleSlug)
                    ->value('id');

                $records = [];

                foreach ($permissionSlugs as $permissionSlug) {
                    if (isset($allPermissions[$permissionSlug])) {
                        $records[] = [
                            'role_id' => $roleId,
                            'permission_id' => $allPermissions[$permissionSlug],
                        ];
                    }
                }

                DB::table('role_permissions')
                    ->where('role_id', $roleId)
                    ->delete();

                if (!empty($records)) {
                    DB::table('role_permissions')->insert($records);
                }
            }
        });
    }
}
