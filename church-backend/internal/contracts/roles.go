package contracts

// Role is the closed set of roles a user can hold in the system. It
// lives in contracts (not in the auth module) because every module
// needs to reason about roles for authorization, and contracts is the
// only thing every module is allowed to depend on.
type Role string

const (
	RoleSuperAdmin                 Role = "super_admin"
	RoleGeneralOverseer            Role = "general_overseer"
	RoleResidentPastor             Role = "resident_pastor"
	RoleChurchAdmin                Role = "church_admin"
	RoleSectorLead                 Role = "sector_lead"
	RoleTeamLead                   Role = "team_lead"
	RoleAssistantTeamLead          Role = "assistant_team_lead"
	RoleMembershipTeamLead         Role = "membership_team_lead"
	RoleMembershipAssistantTeamLead Role = "membership_assistant_team_lead"
	RoleInfoCenterLead             Role = "info_center_lead"
	RoleInfoCenterWorker           Role = "info_center_worker"
	RoleTrainingCoordinator        Role = "training_coordinator"
	RoleClassTeacher               Role = "class_teacher"
	RoleSteward                    Role = "steward"
	RoleMember                     Role = "member"
	RoleFirstTimer                 Role = "first_timer"
	RoleGuest                      Role = "guest"
)

// AllRoles is the canonical list, used for validation (e.g. when an
// admin assigns a role) and for rendering role pickers on the frontend.
var AllRoles = []Role{
	RoleSuperAdmin,
	RoleGeneralOverseer,
	RoleResidentPastor,
	RoleChurchAdmin,
	RoleSectorLead,
	RoleTeamLead,
	RoleAssistantTeamLead,
	RoleMembershipTeamLead,
	RoleMembershipAssistantTeamLead,
	RoleInfoCenterLead,
	RoleInfoCenterWorker,
	RoleTrainingCoordinator,
	RoleClassTeacher,
	RoleSteward,
	RoleMember,
	RoleFirstTimer,
	RoleGuest,
}

func IsValidRole(r string) bool {
	for _, valid := range AllRoles {
		if string(valid) == r {
			return true
		}
	}
	return false
}
