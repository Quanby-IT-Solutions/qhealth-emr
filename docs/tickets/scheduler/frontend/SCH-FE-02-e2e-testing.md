# [SCH-FE-02] Scheduler Telemedicine — End-to-End Testing

**Role:** Scheduler
**Layer:** Frontend + Backend (Integration)
**Category:** Testing & Quality Assurance
**Priority:** P1
**Story Refs:** User Flow M2, N1
**Flow Refs:** Section M — Scheduling, Section N — Telemedicine

## Description

Create comprehensive end-to-end tests for the scheduler telemedicine booking workflow. Tests should cover the complete user journey from login through appointment booking, including permission checks, validation, and error handling.

## Context

**Testing Scope:**

- Scheduler can book telemedicine appointments
- Scheduler cannot perform clinical actions (sign prescriptions)
- Physician workflow remains unchanged
- Permission-based UI rendering works correctly
- Error messages are clear and actionable

## Test Files to Create

### 1. E2E Test Suite

**Path:** `apps/web/e2e/scheduler-telemedicine-workflow.spec.ts`

### 2. Component Integration Tests

**Path:** `apps/web/features/scheduling/components/__tests__/appointment-booking-form.integration.test.tsx`

## Implementation

### 1. E2E Test Suite (Playwright/Cypress)

```typescript
// apps/web/e2e/scheduler-telemedicine-workflow.spec.ts

import { expect, test } from "@playwright/test"

test.describe("Scheduler Telemedicine Workflow", () => {
	test.beforeEach(async ({ page }) => {
		// Login as scheduler
		await page.goto("/login")
		await page.fill('[name="email"]', "scheduler@hospital.com")
		await page.fill('[name="password"]', "test-password")
		await page.click('button[type="submit"]')
		await page.waitForURL("/dashboard")
	})

	test("scheduler can book telemedicine appointment", async ({ page }) => {
		// Navigate to appointment booking
		await page.goto("/scheduling/appointments/new")

		// Select patient
		await page.fill('[name="patientId"]', "John Doe")
		await page.click('text="John Doe - MRN: 12345"')

		// Select telemedicine type
		await page.click('[name="appointmentType"]')
		await page.click('text="Telemedicine"')

		// Verify telemedicine fields appear
		await expect(page.locator("text=Telemedicine Details")).toBeVisible()
		await expect(page.locator('[name="clinicianStaffId"]')).toBeVisible()

		// Select physician
		await page.click('[name="clinicianStaffId"]')
		await page.click('text="Dr. Jane Smith - Cardiology"')

		// Select platform
		await page.click('[name="platform"]')
		await page.click('text="LiveKit (Built-in)"')

		// Select duration
		await page.click('[name="durationMinutes"]')
		await page.click('text="30 minutes"')

		// Set date and time
		await page.fill('[name="scheduledDate"]', "2026-06-01")
		await page.fill('[name="scheduledTime"]', "10:00")

		// Submit form
		await page.click('button:has-text("Book Appointment")')

		// Verify success
		await expect(page.locator('text="Appointment booked successfully"')).toBeVisible()

		// Verify appointment appears in list
		await page.goto("/scheduling/appointments")
		await expect(page.locator('text="John Doe"')).toBeVisible()
		await expect(
			page.locator('[data-testid="appointment-type-badge"]:has-text("Telemedicine")')
		).toBeVisible()
	})

	test("scheduler cannot book without selecting physician", async ({ page }) => {
		await page.goto("/scheduling/appointments/new")

		// Select patient
		await page.fill('[name="patientId"]', "John Doe")
		await page.click('text="John Doe - MRN: 12345"')

		// Select telemedicine type
		await page.click('[name="appointmentType"]')
		await page.click('text="Telemedicine"')

		// Skip physician selection
		await page.fill('[name="scheduledDate"]', "2026-06-01")
		await page.fill('[name="scheduledTime"]', "10:00")

		// Try to submit
		await page.click('button:has-text("Book Appointment")')

		// Verify error message
		await expect(
			page.locator('text="Physician is required for telemedicine appointments"')
		).toBeVisible()
	})

	test("scheduler cannot access prescription signing", async ({ page }) => {
		// Navigate to a telemedicine encounter
		await page.goto("/telemedicine/encounters/test-encounter-id")

		// Verify prescription section is not visible or disabled
		const signButton = page.locator('button:has-text("Sign Prescription")')
		await expect(signButton).not.toBeVisible()
	})

	test("scheduler sees telemedicine option in appointment type", async ({ page }) => {
		await page.goto("/scheduling/appointments/new")

		await page.click('[name="appointmentType"]')

		// Verify telemedicine option is available
		await expect(page.locator('text="Telemedicine"')).toBeVisible()
		await expect(page.locator('text="In-Person"')).toBeVisible()
	})

	test("appointment list shows telemedicine badge", async ({ page }) => {
		// Assuming there's already a telemedicine appointment
		await page.goto("/scheduling/appointments")

		// Verify telemedicine badge is visible
		const telemedicineBadge = page.locator(
			'[data-testid="appointment-type-badge"]:has-text("Telemedicine")'
		)
		await expect(telemedicineBadge).toBeVisible()

		// Verify video icon is present
		const videoIcon = page.locator('[data-testid="video-icon"]')
		await expect(videoIcon).toBeVisible()
	})

	test("scheduler can reschedule telemedicine appointment", async ({ page }) => {
		await page.goto("/scheduling/appointments")

		// Click on a telemedicine appointment
		await page.click('tr:has-text("Telemedicine") button:has-text("Edit")')

		// Change date
		await page.fill('[name="scheduledDate"]', "2026-06-02")
		await page.fill('[name="scheduledTime"]', "14:00")

		// Save changes
		await page.click('button:has-text("Save Changes")')

		// Verify success
		await expect(page.locator('text="Appointment updated successfully"')).toBeVisible()
	})

	test("error handling for backend validation", async ({ page }) => {
		await page.goto("/scheduling/appointments/new")

		// Mock backend error response
		await page.route("**/api/v1/telemedicine/appointments", route => {
			route.fulfill({
				status: 400,
				body: JSON.stringify({
					message: "Schedulers must assign a physician to telemedicine appointments",
				}),
			})
		})

		// Fill form
		await page.fill('[name="patientId"]', "John Doe")
		await page.click('text="John Doe - MRN: 12345"')
		await page.click('[name="appointmentType"]')
		await page.click('text="Telemedicine"')
		await page.fill('[name="scheduledDate"]', "2026-06-01")
		await page.fill('[name="scheduledTime"]', "10:00")

		// Submit
		await page.click('button:has-text("Book Appointment")')

		// Verify error message from backend
		await expect(page.locator('text="Schedulers must assign a physician"')).toBeVisible()
	})
})

test.describe("Physician Telemedicine Workflow (Unchanged)", () => {
	test.beforeEach(async ({ page }) => {
		// Login as physician
		await page.goto("/login")
		await page.fill('[name="email"]', "physician@hospital.com")
		await page.fill('[name="password"]', "test-password")
		await page.click('button[type="submit"]')
		await page.waitForURL("/dashboard")
	})

	test("physician can create and self-assign telemedicine appointment", async ({ page }) => {
		await page.goto("/scheduling/appointments/new")

		await page.fill('[name="patientId"]', "John Doe")
		await page.click('text="John Doe - MRN: 12345"')
		await page.click('[name="appointmentType"]')
		await page.click('text="Telemedicine"')

		// Physician can self-assign
		await page.click('[name="clinicianStaffId"]')
		await page.click('text="Dr. Current User (Me)"')

		await page.fill('[name="scheduledDate"]', "2026-06-01")
		await page.fill('[name="scheduledTime"]', "10:00")
		await page.click('button:has-text("Book Appointment")')

		await expect(page.locator('text="Appointment booked successfully"')).toBeVisible()
	})

	test("physician can sign prescriptions", async ({ page }) => {
		await page.goto("/telemedicine/encounters/test-encounter-id")

		// Verify sign button is visible
		const signButton = page.locator('button:has-text("Sign Prescription")')
		await expect(signButton).toBeVisible()

		// Click and verify modal
		await signButton.click()
		await expect(page.locator('text="Confirm Prescription Signature"')).toBeVisible()
	})
})
```

### 2. Component Integration Tests

```tsx
// apps/web/features/scheduling/components/__tests__/appointment-booking-form.integration.test.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { AppointmentBookingForm } from "../appointment-booking-form"

const mockCreateAppointment = vi.fn()
const mockPhysicians = [
	{ id: "phys-1", name: "Dr. Jane Smith", specialty: "Cardiology", department: "Cardiology" },
	{ id: "phys-2", name: "Dr. John Doe", specialty: "Neurology", department: "Neurology" },
]

vi.mock("@/features/scheduling/api/appointments.hooks", () => ({
	useCreateAppointmentMutation: () => ({
		mutateAsync: mockCreateAppointment,
		isPending: false,
	}),
}))

vi.mock("@/features/scheduling/api/physicians.hooks", () => ({
	usePhysiciansQuery: () => ({
		data: mockPhysicians,
		isLoading: false,
	}),
}))

vi.mock("@/core/hooks/use-permissions", () => ({
	usePermissions: () => ({
		canCreateTelemedicine: true,
	}),
}))

describe("AppointmentBookingForm - Telemedicine Integration", () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		mockCreateAppointment.mockClear()
	})

	const renderForm = () => {
		return render(
			<QueryClientProvider client={queryClient}>
				<AppointmentBookingForm />
			</QueryClientProvider>
		)
	}

	it("shows telemedicine fields when telemedicine type selected", async () => {
		renderForm()
		const user = userEvent.setup()

		// Select telemedicine type
		const typeSelect = screen.getByLabelText(/appointment type/i)
		await user.click(typeSelect)
		await user.click(screen.getByText("Telemedicine"))

		// Verify telemedicine fields appear
		await waitFor(() => {
			expect(screen.getByText("Telemedicine Details")).toBeInTheDocument()
			expect(screen.getByLabelText(/physician/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/video platform/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
		})
	})

	it("hides telemedicine fields when in-person type selected", async () => {
		renderForm()
		const user = userEvent.setup()

		// Select telemedicine first
		const typeSelect = screen.getByLabelText(/appointment type/i)
		await user.click(typeSelect)
		await user.click(screen.getByText("Telemedicine"))

		// Verify fields appear
		await waitFor(() => {
			expect(screen.getByText("Telemedicine Details")).toBeInTheDocument()
		})

		// Switch to in-person
		await user.click(typeSelect)
		await user.click(screen.getByText("In-Person"))

		// Verify telemedicine fields are hidden
		await waitFor(() => {
			expect(screen.queryByText("Telemedicine Details")).not.toBeInTheDocument()
		})
	})

	it("validates physician is required for telemedicine", async () => {
		renderForm()
		const user = userEvent.setup()

		// Fill patient
		await user.type(screen.getByLabelText(/patient/i), "John Doe")

		// Select telemedicine
		const typeSelect = screen.getByLabelText(/appointment type/i)
		await user.click(typeSelect)
		await user.click(screen.getByText("Telemedicine"))

		// Fill date/time but skip physician
		await user.type(screen.getByLabelText(/date/i), "2026-06-01")
		await user.type(screen.getByLabelText(/time/i), "10:00")

		// Try to submit
		await user.click(screen.getByRole("button", { name: /book appointment/i }))

		// Verify error
		await waitFor(() => {
			expect(screen.getByText(/physician is required/i)).toBeInTheDocument()
		})

		// Verify API was not called
		expect(mockCreateAppointment).not.toHaveBeenCalled()
	})

	it("submits telemedicine appointment with all required fields", async () => {
		mockCreateAppointment.mockResolvedValue({ id: "appt-123" })
		renderForm()
		const user = userEvent.setup()

		// Fill form
		await user.type(screen.getByLabelText(/patient/i), "John Doe")

		const typeSelect = screen.getByLabelText(/appointment type/i)
		await user.click(typeSelect)
		await user.click(screen.getByText("Telemedicine"))

		// Select physician
		const physicianSelect = screen.getByLabelText(/physician/i)
		await user.click(physicianSelect)
		await user.click(screen.getByText("Dr. Jane Smith"))

		// Fill date/time
		await user.type(screen.getByLabelText(/date/i), "2026-06-01")
		await user.type(screen.getByLabelText(/time/i), "10:00")

		// Submit
		await user.click(screen.getByRole("button", { name: /book appointment/i }))

		// Verify API called with correct data
		await waitFor(() => {
			expect(mockCreateAppointment).toHaveBeenCalledWith(
				expect.objectContaining({
					patientId: expect.any(String),
					clinicianStaffId: "phys-1",
					scheduledDate: "2026-06-01",
					scheduledTime: "10:00",
					platform: "livekit",
					durationMinutes: 30,
				})
			)
		})
	})

	it("shows loading state during submission", async () => {
		mockCreateAppointment.mockImplementation(
			() => new Promise(resolve => setTimeout(resolve, 1000))
		)
		renderForm()
		const user = userEvent.setup()

		// Fill and submit form
		await user.type(screen.getByLabelText(/patient/i), "John Doe")
		const typeSelect = screen.getByLabelText(/appointment type/i)
		await user.click(typeSelect)
		await user.click(screen.getByText("Telemedicine"))

		const physicianSelect = screen.getByLabelText(/physician/i)
		await user.click(physicianSelect)
		await user.click(screen.getByText("Dr. Jane Smith"))

		await user.type(screen.getByLabelText(/date/i), "2026-06-01")
		await user.type(screen.getByLabelText(/time/i), "10:00")
		await user.click(screen.getByRole("button", { name: /book appointment/i }))

		// Verify loading state
		expect(screen.getByRole("button", { name: /booking/i })).toBeDisabled()
	})

	it("displays error message on submission failure", async () => {
		mockCreateAppointment.mockRejectedValue(new Error("Schedulers must assign a physician"))
		renderForm()
		const user = userEvent.setup()

		// Fill and submit form
		await user.type(screen.getByLabelText(/patient/i), "John Doe")
		const typeSelect = screen.getByLabelText(/appointment type/i)
		await user.click(typeSelect)
		await user.click(screen.getByText("Telemedicine"))

		const physicianSelect = screen.getByLabelText(/physician/i)
		await user.click(physicianSelect)
		await user.click(screen.getByText("Dr. Jane Smith"))

		await user.type(screen.getByLabelText(/date/i), "2026-06-01")
		await user.type(screen.getByLabelText(/time/i), "10:00")
		await user.click(screen.getByRole("button", { name: /book appointment/i }))

		// Verify error message
		await waitFor(() => {
			expect(screen.getByText(/schedulers must assign a physician/i)).toBeInTheDocument()
		})
	})
})
```

## Test Coverage Requirements

### Backend API Tests

**File:** `apps/backend/test/telemedicine-scheduler-workflow.e2e-spec.ts`

```typescript
describe("Scheduler Telemedicine API (E2E)", () => {
	it("allows scheduler to create telemedicine appointment", async () => {
		const schedulerToken = await loginAs("scheduler@hospital.com")

		const response = await request(app.getHttpServer())
			.post("/api/v1/telemedicine/appointments")
			.set("Authorization", `Bearer ${schedulerToken}`)
			.send({
				facilityId: testFacilityId,
				patientId: testPatientId,
				clinicianStaffId: testPhysicianStaffId,
				scheduledDate: "2026-06-01",
				scheduledTime: "14:00",
				platform: "livekit",
			})
			.expect(201)

		expect(response.body.id).toBeDefined()
	})

	it("rejects scheduler self-assignment", async () => {
		const schedulerToken = await loginAs("scheduler@hospital.com")
		const schedulerStaffId = await getStaffIdForUser("scheduler@hospital.com")

		await request(app.getHttpServer())
			.post("/api/v1/telemedicine/appointments")
			.set("Authorization", `Bearer ${schedulerToken}`)
			.send({
				facilityId: testFacilityId,
				patientId: testPatientId,
				clinicianStaffId: schedulerStaffId, // Same as creator
				scheduledDate: "2026-06-01",
				scheduledTime: "14:00",
			})
			.expect(400)
			.expect(res => {
				expect(res.body.message).toContain("cannot assign themselves")
			})
	})

	it("prevents scheduler from signing prescriptions", async () => {
		const schedulerToken = await loginAs("scheduler@hospital.com")

		await request(app.getHttpServer())
			.post(`/api/v1/telemedicine/prescriptions/${prescriptionId}/sign`)
			.set("Authorization", `Bearer ${schedulerToken}`)
			.expect(403) // Forbidden
	})
})
```

## Acceptance Criteria

- [ ] E2E test suite covers complete scheduler workflow
- [ ] Tests verify permission-based UI rendering
- [ ] Tests verify backend validation (no self-assignment)
- [ ] Tests verify physician workflow unchanged
- [ ] Component integration tests cover form validation
- [ ] Tests cover error handling and edge cases
- [ ] All tests pass in CI/CD pipeline
- [ ] Test coverage > 80% for new code
- [ ] Tests run in < 5 minutes
- [ ] Tests are deterministic (no flaky tests)

## Dependencies

**Requires:**

- SCH-BE-01, SCH-BE-02, SCH-BE-03 (Backend implementation)
- SCH-FE-01 (Frontend UI)
- Playwright or Cypress configured
- Test database seeded with test data

**Blocks:**

- Production deployment

## Test Data Setup

```typescript
// test/fixtures/scheduler-telemedicine.fixture.ts

export const testScheduler = {
	email: "scheduler@hospital.com",
	password: "test-password",
	roles: ["Scheduler"],
}

export const testPhysician = {
	email: "physician@hospital.com",
	password: "test-password",
	roles: ["Physician"],
}

export const testPatient = {
	firstName: "John",
	lastName: "Doe",
	mrn: "12345",
}

export const testTelemedicineAppointment = {
	scheduledDate: "2026-06-01",
	scheduledTime: "10:00",
	platform: "livekit",
	durationMinutes: 30,
}
```

## Performance Benchmarks

- E2E test suite should complete in < 5 minutes
- Individual test should complete in < 30 seconds
- API response time < 500ms for appointment creation
- UI should render telemedicine fields in < 100ms

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm db:migrate
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```
