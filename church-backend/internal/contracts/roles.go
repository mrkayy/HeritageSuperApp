package contracts

// Role is the closed set of roles a user can hold in the system. It
// lives in contracts (not in the auth module) because every module
// needs to reason about roles for authorization, and contracts is the
// only thing every module is allowed to depend on.
type Role string

const (
	RoleChurchAdmin    Role = "church_admin"
	RoleTeamLead       Role = "team_lead"
	RoleResidentPastor Role = "resident_pastor"
	RoleSteward        Role = "steward"
	RoleMember         Role = "member"
	RoleFirstTimer     Role = "first_timer"
	RoleGuest          Role = "guest"
)

// AllRoles is the canonical list, used for validation (e.g. when an
// admin assigns a role) and for rendering role pickers on the frontend.
var AllRoles = []Role{
	RoleChurchAdmin,
	RoleTeamLead,
	RoleResidentPastor,
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
