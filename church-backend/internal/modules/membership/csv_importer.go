package membership

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/hofchurchng/church-backend/internal/contracts"
	"github.com/hofchurchng/church-backend/internal/ent"
	"github.com/hofchurchng/church-backend/internal/ent/member"
	"github.com/hofchurchng/church-backend/internal/ent/membershipstagehistory"
)

type CSVRowJob struct {
	Index int
	Row   []string
}

type BulkRowErrorDetail struct {
	Row   int    `json:"row"`
	Name  string `json:"name"`
	Error string `json:"error"`
}

type BulkImportResult struct {
	TotalRecords int                  `json:"totalRecords"`
	SuccessCount int                  `json:"successCount"`
	SkippedCount int                  `json:"skippedCount"`
	ErrorCount   int                  `json:"errorCount"`
	Errors       []BulkRowErrorDetail `json:"errors"`
}

type headerMap struct {
	firstNameIdx   int
	surnameIdx     int
	fullNameIdx    int
	emailIdx       int
	phoneIdx       int
	addressIdx     int
	genderIdx      int
	dobIdx         int
	maritalIdx     int
	anniversaryIdx int
	occupationIdx  int
	stageIdx       int
	roleIdx        int
}

func parseCSVHeader(header []string) headerMap {
	hm := headerMap{
		firstNameIdx:   -1,
		surnameIdx:     -1,
		fullNameIdx:    -1,
		emailIdx:       -1,
		phoneIdx:       -1,
		addressIdx:     -1,
		genderIdx:      -1,
		dobIdx:         -1,
		maritalIdx:     -1,
		anniversaryIdx: -1,
		occupationIdx:  -1,
		stageIdx:       -1,
		roleIdx:        -1,
	}

	for i, col := range header {
		lower := strings.ToLower(strings.TrimSpace(col))
		switch {
		case strings.Contains(lower, "first name") || lower == "firstname":
			hm.firstNameIdx = i
		case strings.Contains(lower, "surname") || strings.Contains(lower, "last name") || lower == "lastname":
			hm.surnameIdx = i
		case lower == "name" || strings.Contains(lower, "full name"):
			hm.fullNameIdx = i
		case strings.Contains(lower, "email"):
			hm.emailIdx = i
		case strings.Contains(lower, "phone") || strings.Contains(lower, "mobile") || strings.Contains(lower, "contact"):
			hm.phoneIdx = i
		case strings.Contains(lower, "address") || strings.Contains(lower, "location"):
			hm.addressIdx = i
		case strings.Contains(lower, "gender") || lower == "sex":
			hm.genderIdx = i
		case strings.Contains(lower, "birth") || lower == "dob":
			hm.dobIdx = i
		case strings.Contains(lower, "marital"):
			hm.maritalIdx = i
		case strings.Contains(lower, "anniversary") || strings.Contains(lower, "wedding"):
			hm.anniversaryIdx = i
		case strings.Contains(lower, "occupation") || strings.Contains(lower, "job"):
			hm.occupationIdx = i
		case strings.Contains(lower, "stage"):
			hm.stageIdx = i
		case strings.Contains(lower, "role"):
			hm.roleIdx = i
		}
	}

	return hm
}

var monthNames = map[string]int16{
	"jan": 1, "january": 1,
	"feb": 2, "february": 2,
	"mar": 3, "march": 3,
	"apr": 4, "april": 4,
	"may": 5,
	"jun": 6, "june": 6,
	"jul": 7, "july": 7,
	"aug": 8, "august": 8,
	"sep": 9, "september": 9, "sept": 9,
	"oct": 10, "october": 10,
	"nov": 11, "november": 11,
	"dec": 12, "december": 12,
}

// parseDayMonth parses strings like "7-November", "17-January", "11/7", "7/11/1995"
func parseDayMonth(val string) (*int16, *int16) {
	val = strings.TrimSpace(val)
	if val == "" || strings.EqualFold(val, "nil") || strings.EqualFold(val, "n/a") {
		return nil, nil
	}

	// Case 1: "7-November" or "17-Jan" or "November 7"
	reAlpha := regexp.MustCompile(`(?i)^\s*(\d{1,2})[\s\-\/]+([a-z]+)\s*$`)
	if m := reAlpha.FindStringSubmatch(val); len(m) == 3 {
		day, _ := strconv.Atoi(m[1])
		monthStr := strings.ToLower(m[2])
		if monthNum, ok := monthNames[monthStr]; ok && day >= 1 && day <= 31 {
			d := int16(day)
			return &d, &monthNum
		}
	}

	reAlphaRev := regexp.MustCompile(`(?i)^\s*([a-z]+)[\s\-\/]+(\d{1,2})\s*$`)
	if m := reAlphaRev.FindStringSubmatch(val); len(m) == 3 {
		day, _ := strconv.Atoi(m[2])
		monthStr := strings.ToLower(m[1])
		if monthNum, ok := monthNames[monthStr]; ok && day >= 1 && day <= 31 {
			d := int16(day)
			return &d, &monthNum
		}
	}

	// Case 2: Numeric date like "11/7" or "7/11/1995"
	reNum := regexp.MustCompile(`^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]\d{2,4})?$`)
	if m := reNum.FindStringSubmatch(val); len(m) >= 3 {
		num1, _ := strconv.Atoi(m[1])
		num2, _ := strconv.Atoi(m[2])
		if num1 >= 1 && num1 <= 31 && num2 >= 1 && num2 <= 12 {
			d := int16(num1)
			m := int16(num2)
			return &d, &m
		}
	}

	return nil, nil
}

func sanitizePhone(val string) *string {
	cleaned := strings.TrimSpace(val)
	if cleaned == "" || strings.EqualFold(cleaned, "nil") || strings.EqualFold(cleaned, "no phone number") || strings.EqualFold(cleaned, "wrong number") {
		return nil
	}
	if len(cleaned) == 10 && (cleaned[0] == '7' || cleaned[0] == '8' || cleaned[0] == '9') {
		cleaned = "0" + cleaned
	}
	return &cleaned
}

// ---------------------------------------------------------------------------
// Levenshtein Distance & Fuzzy Matching Utilities
// ---------------------------------------------------------------------------

// LevenshteinDistance calculates the minimum edit distance between two strings
func LevenshteinDistance(s1, s2 string) int {
	s1 = strings.ToLower(strings.TrimSpace(s1))
	s2 = strings.ToLower(strings.TrimSpace(s2))

	r1, r2 := []rune(s1), []rune(s2)
	len1, len2 := len(r1), len(r2)

	if len1 == 0 {
		return len2
	}
	if len2 == 0 {
		return len1
	}

	column := make([]int, len1+1)
	for i := 0; i <= len1; i++ {
		column[i] = i
	}

	for j := 1; j <= len2; j++ {
		column[0] = j
		lastDiagonal := j - 1
		for i := 1; i <= len1; i++ {
			oldColumn := column[i]
			cost := 0
			if r1[i-1] != r2[j-1] {
				cost = 1
			}
			column[i] = minInt(column[i]+1, minInt(column[i-1]+1, lastDiagonal+cost))
			lastDiagonal = oldColumn
		}
	}
	return column[len1]
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func calculateSimilarityRatio(s1, s2 string) float64 {
	dist := LevenshteinDistance(s1, s2)
	maxLen := len([]rune(s1))
	if len2 := len([]rune(s2)); len2 > maxLen {
		maxLen = len2
	}
	if maxLen == 0 {
		return 1.0
	}
	return 1.0 - (float64(dist) / float64(maxLen))
}

func normalizePhoneNumber(phone string) string {
	cleaned := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	if strings.HasPrefix(cleaned, "234") && len(cleaned) == 13 {
		cleaned = "0" + cleaned[3:]
	} else if len(cleaned) == 10 && (cleaned[0] == '7' || cleaned[0] == '8' || cleaned[0] == '9') {
		cleaned = "0" + cleaned
	}
	return cleaned
}

// findMatchingMember finds an existing member using Email or Levenshtein distance on Name & Phone
func (s *Service) findMatchingMember(ctx context.Context, firstName, surname string, email string, phone *string) (*ent.Member, error) {
	// 1. Exact Email match
	if email != "" && strings.Contains(email, "@") {
		if m, err := s.repo.db.Member.Query().Where(member.Email(email)).First(ctx); err == nil && m != nil {
			return m, nil
		}
	}

	// 2. Fetch all members to perform Levenshtein fuzzy matching on (Name, Phone)
	members, err := s.repo.db.Member.Query().All(ctx)
	if err != nil || len(members) == 0 {
		return nil, err
	}

	inputFullName := strings.ToLower(strings.TrimSpace(firstName + " " + surname))
	inputPhone := ""
	if phone != nil {
		inputPhone = normalizePhoneNumber(*phone)
	}

	var bestMatch *ent.Member
	lowestDist := 999

	for _, m := range members {
		mFullName := strings.ToLower(strings.TrimSpace(m.FirstName + " " + m.Surname))
		mPhone := ""
		if m.PhoneNumber != nil {
			mPhone = normalizePhoneNumber(*m.PhoneNumber)
		}

		nameDist := LevenshteinDistance(inputFullName, mFullName)
		nameSim := calculateSimilarityRatio(inputFullName, mFullName)

		phoneMatched := false
		phoneDist := 999
		if inputPhone != "" && mPhone != "" {
			phoneDist = LevenshteinDistance(inputPhone, mPhone)
			if inputPhone == mPhone || phoneDist <= 1 {
				phoneMatched = true
			}
		}

		// Fuzzy match logic:
		// A: Phone match/near-match (phoneDist <= 1) AND (nameDist <= 3 OR nameSim >= 0.70)
		// B: Name distance <= 2 AND (inputPhone == "" || mPhone == "" || phoneDist <= 2)
		if (phoneMatched && (nameDist <= 3 || nameSim >= 0.70)) || (nameDist <= 2 && (inputPhone == "" || mPhone == "" || phoneDist <= 2)) {
			if nameDist < lowestDist {
				lowestDist = nameDist
				bestMatch = m
			}
		}
	}

	if bestMatch != nil {
		return bestMatch, nil
	}

	return nil, nil
}

// BulkImportCSV handles fast goroutine-based bulk profiling of CSV member records
func (s *Service) BulkImportCSV(ctx context.Context, r io.Reader, creatorID *uuid.UUID) (BulkImportResult, error) {
	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1 // Allow variable column counts
	reader.TrimLeadingSpace = true

	rows, err := reader.ReadAll()
	if err != nil {
		return BulkImportResult{}, fmt.Errorf("failed to parse CSV: %w", err)
	}

	if len(rows) < 2 {
		return BulkImportResult{}, fmt.Errorf("CSV file is empty or missing data rows")
	}

	header := rows[0]
	hm := parseCSVHeader(header)
	dataRows := rows[1:]

	totalRecords := len(dataRows)
	jobs := make(chan CSVRowJob, totalRecords)
	results := make(chan BulkRowErrorDetail, totalRecords)

	// Goroutine Worker Pool size (10 concurrent workers)
	numWorkers := 10
	var wg sync.WaitGroup

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				err := s.processCSVRow(ctx, job.Row, hm, creatorID)
				if err != nil {
					name := "Row " + strconv.Itoa(job.Index+1)
					if hm.firstNameIdx != -1 && hm.firstNameIdx < len(job.Row) {
						name = job.Row[hm.firstNameIdx]
					}
					results <- BulkRowErrorDetail{
						Row:   job.Index + 1,
						Name:  name,
						Error: err.Error(),
					}
				} else {
					results <- BulkRowErrorDetail{Row: 0}
				}
			}
		}()
	}

	// Dispatch jobs
	for i, row := range dataRows {
		jobs <- CSVRowJob{Index: i + 1, Row: row}
	}
	close(jobs)

	// Wait for workers to finish
	wg.Wait()
	close(results)

	// Collect results
	res := BulkImportResult{
		TotalRecords: totalRecords,
		Errors:       []BulkRowErrorDetail{},
	}

	for r := range results {
		if r.Row == 0 {
			res.SuccessCount++
		} else {
			res.ErrorCount++
			res.Errors = append(res.Errors, r)
		}
	}

	return res, nil
}

func (s *Service) processCSVRow(ctx context.Context, row []string, hm headerMap, creatorID *uuid.UUID) error {
	getVal := func(idx int) string {
		if idx >= 0 && idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
		return ""
	}

	firstName := getVal(hm.firstNameIdx)
	surname := getVal(hm.surnameIdx)
	fullName := getVal(hm.fullNameIdx)

	if firstName == "" && surname == "" && fullName != "" {
		parts := strings.SplitN(fullName, " ", 2)
		firstName = parts[0]
		if len(parts) > 1 {
			surname = parts[1]
		}
	} else if surname == "" && strings.Contains(firstName, " ") {
		parts := strings.SplitN(firstName, " ", 2)
		firstName = parts[0]
		surname = parts[1]
	}

	if firstName == "" {
		return fmt.Errorf("missing first name")
	}

	email := strings.TrimSpace(strings.ToLower(getVal(hm.emailIdx)))
	phone := sanitizePhone(getVal(hm.phoneIdx))
	address := getVal(hm.addressIdx)
	genderStr := strings.ToLower(getVal(hm.genderIdx))
	maritalStr := strings.ToLower(getVal(hm.maritalIdx))
	occupation := getVal(hm.occupationIdx)
	stageStr := strings.ToLower(getVal(hm.stageIdx))
	roleStr := strings.ToLower(getVal(hm.roleIdx))

	if roleStr == "" || !contracts.IsValidRole(roleStr) {
		roleStr = "member"
	}

	if stageStr == "" {
		stageStr = string(membershipstagehistory.StageFirstTimeGuest)
	}

	dobDay, dobMonth := parseDayMonth(getVal(hm.dobIdx))
	annDay, annMonth := parseDayMonth(getVal(hm.anniversaryIdx))

	var gender *string
	if genderStr != "" {
		if strings.HasPrefix(genderStr, "f") {
			g := "female"
			gender = &g
		} else if strings.HasPrefix(genderStr, "m") {
			g := "male"
			gender = &g
		}
	}

	var marital *string
	if maritalStr != "" {
		if strings.Contains(maritalStr, "marri") {
			m := "married"
			marital = &m
		} else if strings.Contains(maritalStr, "singl") {
			m := "single"
			marital = &m
		}
	}

	var addrPtr *string
	if address != "" {
		addrPtr = &address
	}
	var jobPtr *string
	if occupation != "" {
		jobPtr = &occupation
	}

	// Check if member already exists via Email or Levenshtein distance on Name & Phone
	existingMember, _ := s.findMatchingMember(ctx, firstName, surname, email, phone)
	if existingMember != nil {
		// Update existing member record
		var emailPtr *string
		if email != "" {
			emailPtr = &email
		}
		_, err := s.repo.Update(ctx, existingMember.ID.String(), AddMemberInput{
			FirstName:               firstName,
			Surname:                 surname,
			Role:                    roleStr,
			Email:                   emailPtr,
			PhoneNumber:             phone,
			HomeAddress:             addrPtr,
			Gender:                  gender,
			DateOfBirthDay:          dobDay,
			DateOfBirthMonth:        dobMonth,
			MaritalStatus:           marital,
			WeddingAnniversaryDay:   annDay,
			WeddingAnniversaryMonth: annMonth,
			JobOccupation:           jobPtr,
			CurrentStage:            &stageStr,
		})
		return err
	}

	// If email present and no match, try profiling member with user account creation
	if email != "" && strings.Contains(email, "@") {
		_, err := s.repo.ProfileNewMember(ctx, ProfileMemberInput{
			FirstName:    firstName,
			Surname:      surname,
			Email:        email,
			Role:         roleStr,
			CurrentStage: &stageStr,
			CreatedBy:    creatorID,
		})
		if err == nil {
			if memberRec, getErr := s.repo.db.Member.Query().Where(member.Email(email)).Only(ctx); getErr == nil {
				u := s.repo.db.Member.UpdateOneID(memberRec.ID)
				if phone != nil { u.SetPhoneNumber(*phone) }
				if addrPtr != nil { u.SetHomeAddress(*addrPtr) }
				if gender != nil { u.SetGender(member.Gender(*gender)) }
				if dobDay != nil { u.SetDateOfBirthDay(*dobDay) }
				if dobMonth != nil { u.SetDateOfBirthMonth(*dobMonth) }
				if marital != nil { u.SetMaritalStatus(member.MaritalStatus(*marital)) }
				if annDay != nil { u.SetWeddingAnniversaryDay(*annDay) }
				if annMonth != nil { u.SetWeddingAnniversaryMonth(*annMonth) }
				if jobPtr != nil { u.SetJobOccupation(*jobPtr) }
				_ = u.Exec(ctx)
			}
			return nil
		}
	}

	// Create new member record
	var emailPtr *string
	if email != "" {
		emailPtr = &email
	}

	_, err := s.repo.Add(ctx, AddMemberInput{
		FirstName:               firstName,
		Surname:                 surname,
		Role:                    roleStr,
		Email:                   emailPtr,
		PhoneNumber:             phone,
		HomeAddress:             addrPtr,
		Gender:                  gender,
		DateOfBirthDay:          dobDay,
		DateOfBirthMonth:        dobMonth,
		MaritalStatus:           marital,
		WeddingAnniversaryDay:   annDay,
		WeddingAnniversaryMonth: annMonth,
		JobOccupation:           jobPtr,
		CurrentStage:            &stageStr,
		CreatedBy:               creatorID,
	})

	return err
}

func (s *Service) BulkImportJSON(ctx context.Context, members []AddMemberInput, creatorID *uuid.UUID) (BulkImportResult, error) {
	totalRecords := len(members)
	if totalRecords == 0 {
		return BulkImportResult{}, fmt.Errorf("no members provided")
	}

	jobs := make(chan AddMemberInput, totalRecords)
	results := make(chan BulkRowErrorDetail, totalRecords)

	numWorkers := 10
	var wg sync.WaitGroup

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				var emailStr string
				if job.Email != nil {
					emailStr = *job.Email
				}

				existingMember, _ := s.findMatchingMember(ctx, job.FirstName, job.Surname, emailStr, job.PhoneNumber)
				var err error
				if existingMember != nil {
					_, err = s.repo.Update(ctx, existingMember.ID.String(), job)
				} else if emailStr != "" {
					stageStr := "first_time_guest"
					if job.CurrentStage != nil {
						stageStr = *job.CurrentStage
					}
					_, err = s.repo.ProfileNewMember(ctx, ProfileMemberInput{
						FirstName:    job.FirstName,
						Surname:      job.Surname,
						Email:        emailStr,
						Role:         job.Role,
						CurrentStage: &stageStr,
						CreatedBy:    creatorID,
					})
					if err == nil {
						if memberRec, getErr := s.repo.db.Member.Query().Where(member.Email(emailStr)).Only(ctx); getErr == nil {
							u := s.repo.db.Member.UpdateOneID(memberRec.ID)
							if job.PhoneNumber != nil { u.SetPhoneNumber(*job.PhoneNumber) }
							if job.HomeAddress != nil { u.SetHomeAddress(*job.HomeAddress) }
							if job.Gender != nil { u.SetGender(member.Gender(*job.Gender)) }
							if job.DateOfBirthDay != nil { u.SetDateOfBirthDay(*job.DateOfBirthDay) }
							if job.DateOfBirthMonth != nil { u.SetDateOfBirthMonth(*job.DateOfBirthMonth) }
							if job.MaritalStatus != nil { u.SetMaritalStatus(member.MaritalStatus(*job.MaritalStatus)) }
							if job.WeddingAnniversaryDay != nil { u.SetWeddingAnniversaryDay(*job.WeddingAnniversaryDay) }
							if job.WeddingAnniversaryMonth != nil { u.SetWeddingAnniversaryMonth(*job.WeddingAnniversaryMonth) }
							if job.JobOccupation != nil { u.SetJobOccupation(*job.JobOccupation) }
							_ = u.Exec(ctx)
						}
					} else {
						_, err = s.repo.Add(ctx, job)
					}
				} else {
					_, err = s.repo.Add(ctx, job)
				}

				if err != nil {
					results <- BulkRowErrorDetail{
						Row:   0,
						Name:  job.FirstName + " " + job.Surname,
						Error: err.Error(),
					}
				} else {
					results <- BulkRowErrorDetail{Row: 0}
				}
			}
		}()
	}

	for _, m := range members {
		jobs <- m
	}
	close(jobs)

	wg.Wait()
	close(results)

	res := BulkImportResult{
		TotalRecords: totalRecords,
		Errors:       []BulkRowErrorDetail{},
	}

	for r := range results {
		if r.Row == 0 && r.Error == "" {
			res.SuccessCount++
		} else {
			res.ErrorCount++
			res.Errors = append(res.Errors, r)
		}
	}

	return res, nil
}
