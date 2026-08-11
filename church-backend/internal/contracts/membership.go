package contracts

import "context"

// Member is the shape other modules are allowed to know about a member.
type Member struct {
	ID                      string  `json:"id"`
	FirstName               string  `json:"firstName"`
	Surname                 string  `json:"surname"`
	Email                   *string `json:"email"`
	PhoneNumber             *string `json:"phoneNumber"`
	HomeAddress             *string `json:"homeAddress"`
	Gender                  *string `json:"gender"`
	DateOfBirthDay          *int16  `json:"dateOfBirthDay"`
	DateOfBirthMonth        *int16  `json:"dateOfBirthMonth"`
	MaritalStatus           *string `json:"maritalStatus"`
	WeddingAnniversaryDay   *int16  `json:"weddingAnniversaryDay"`
	WeddingAnniversaryMonth *int16  `json:"weddingAnniversaryMonth"`
	JobOccupation           *string `json:"jobOccupation"`
	PhotoURL                *string `json:"photoUrl"`
	EmergencyContactName    *string `json:"emergencyContactName"`
	EmergencyContactPhone   *string `json:"emergencyContactPhone"`
	Allergies               *string `json:"allergies"`
	MedicalNotes            *string `json:"medicalNotes"`
	IsPlaceholder           bool    `json:"isPlaceholder"`
	SourceTeam              *string `json:"sourceTeam"`
	CreatedBy               *string `json:"createdBy"`
	LocalChurchID           *string `json:"localChurchId"`
	LocalChurchName         *string `json:"localChurchName"`
	SectorID                *string `json:"sectorId"`
	SectorName              *string `json:"sectorName"`
	TeamID                  *string `json:"teamId"`
	TeamName                *string `json:"teamName"`
	CurrentStage            string  `json:"currentStage"`
	CreatedAt               string  `json:"createdAt"`
	UpdatedAt               string  `json:"updatedAt"`
	Name                    string  `json:"name"` // Computed first_name + surname for compatibility
}

// MembershipReader is implemented by the membership module and consumed
// by any other module that needs member data.
type MembershipReader interface {
	GetMember(ctx context.Context, id string) (Member, error)
}
