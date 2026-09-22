package clock

import (
	"sync"
	"time"
)

// Clock provides an interface for time operations to enable deterministic testing.
type Clock interface {
	Now() time.Time
	Since(t time.Time) time.Duration
}

type realClock struct{}

func NewRealClock() Clock {
	return &realClock{}
}

func (r *realClock) Now() time.Time {
	return time.Now().UTC()
}

func (r *realClock) Since(t time.Time) time.Duration {
	return time.Since(t)
}

// FrozenClock provides a mock clock for testing with frozen time that can be advanced.
type FrozenClock struct {
	mu  sync.RWMutex
	now time.Time
}

func NewFrozenClock(t time.Time) *FrozenClock {
	return &FrozenClock{now: t.UTC()}
}

func (f *FrozenClock) Now() time.Time {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.now
}

func (f *FrozenClock) Since(t time.Time) time.Duration {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.now.Sub(t)
}

func (f *FrozenClock) Set(t time.Time) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = t.UTC()
}

func (f *FrozenClock) Advance(d time.Duration) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = f.now.Add(d)
}
