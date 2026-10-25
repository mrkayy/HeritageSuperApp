package uid

import (
	"sync"

	"github.com/google/uuid"
)

// Generator abstracts UUID generation for deterministic testing.
type Generator interface {
	New() uuid.UUID
}

type realGenerator struct{}

func NewGenerator() Generator {
	return &realGenerator{}
}

func (r *realGenerator) New() uuid.UUID {
	return uuid.New()
}

type StubGenerator struct {
	mu     sync.Mutex
	queue  []uuid.UUID
	defVal uuid.UUID
}

func NewStubGenerator(defaultVal uuid.UUID, sequence ...uuid.UUID) *StubGenerator {
	return &StubGenerator{
		defVal: defaultVal,
		queue:  sequence,
	}
}

func (s *StubGenerator) New() uuid.UUID {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.queue) > 0 {
		next := s.queue[0]
		s.queue = s.queue[1:]
		return next
	}
	return s.defVal
}
