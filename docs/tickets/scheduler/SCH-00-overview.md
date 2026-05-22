# Scheduler Telemedicine Access — Implementation Overview

**Feature:** Enable schedulers to book telemedicine appointments
**Priority:** P0 (Critical Workflow Gap)
**Estimated Effort:** 3-5 days
**Story Refs:** User Flow M2, N1

## Executive Summary

### Problem Statement

The current system has a critical workflow gap:

- **User Flow M2** states schedulers book appointments (including telemedicine)
- **User Flow N1** shows physicians open "scheduled telemedicine appointments"
- **Current RBAC:** Only physicians have `telemedicine` module permissions
- **Result:** Schedulers cannot book telemedicine appointments despite workflow requirements

### Solution

Implement granular RBAC permissions to enable schedulers to book telemedicine appointments while maintaining strict separation between administrative (booking) and clinical (treatment) actions.

**Scheduler Permissions:**

- ✅ `telemedicine:view` - View appointments
- ✅ `telemedicine:create` - Book appointments
- ✅ `telemedicine:edit` - Reschedule/update
- ❌ NO `sign` - Clinical action (physician only)
- ❌ NO `delete` - Clinical action (physician only)

## Implementation Tickets

### Backend Tickets

| Ticket                                                                | Title                                | Priority | Estimated | Dependencies |
| --------------------------------------------------------------------- | ------------------------------------ | -------- | --------- | ------------ |
| [SCH-BE-01](backend/SCH-BE-01-telemedicine-permissions-migration.md)  | Database Migration - Add Permissions | P0       | 2 hours   | None         |
| [SCH-BE-02](backend/SCH-BE-02-telemedicine-business-validation.md)    | Business Logic Validation            | P0       | 4 hours   | SCH-BE-01    |
| [SCH-BE-03](backend/SCH-BE-03-telemedicine-enhanced-audit-logging.md) | Enhanced Audit Logging               | P1       | 3 hours   | SCH-BE-02    |

**Total Backend Effort:** ~9 hours (1-1.5 days)

### Frontend Tickets

| Ticket                                                     | Title                   | Priority | Estimated | Dependencies         |
| ---------------------------------------------------------- | ----------------------- | -------- | --------- | -------------------- |
| [SCH-FE-01](frontend/SCH-FE-01-telemedicine-booking-ui.md) | Telemedicine Booking UI | P0       | 8 hours   | SCH-BE-01, SCH-BE-02 |
| [SCH-FE-02](frontend/SCH-FE-02-e2e-testing.md)             | End-to-End Testing      | P1       | 6 hours   | SCH-FE-01            |

**Total Frontend Effort:** ~14 hours (1.5-2 days)

### Total Estimated Effort

**23 hours** (~3 days) for implementation + testing + deployment buffer = **3-5 days**

## Implementation Sequence

### Phase 1: Backend Foundation (Day 1)

1. ✅ **SCH-BE-01** - Run database migration
2. ✅ **SCH-BE-02** - Implement business validation
3. ✅ Test backend changes in isolation

### Phase 2: Frontend Integration (Day 2)

4. ✅ **SCH-FE-01** - Build telemedicine booking UI
5. ✅ Test UI with backend integration
6. ✅ **SCH-BE-03** - Add enhanced audit logging (parallel)

### Phase 3: Testing & QA (Day 3)

7. ✅ **SCH-FE-02** - Run E2E test suite
8. ✅ Manual QA testing
9. ✅ Performance testing
10. ✅ Security review

### Phase 4: Deployment (Day 4-5)

11. ✅ Deploy to staging
12. ✅ Stakeholder UAT
13. ✅ Deploy to production
14. ✅ Monitor and verify

## Key Features

### For Schedulers

- Book telemedicine appointments via intuitive UI
- Select physician from dropdown (required)
- Choose video platform (LiveKit, Zoom, Teams)
- Set appointment duration
- View all telemedicine appointments
- Reschedule appointments

### For Physicians

- No changes to existing workflow
- Continue to conduct virtual consultations
- Sign prescriptions and abstracts
- Full clinical access maintained

### For Auditors

- Enhanced audit logs with role context
- Track scheduler vs physician actions
- Query by role for compliance reports
- Clear accountability trail

## Technical Architecture

### Database Layer

- No schema changes required
- Uses existing `role_permissions` table
- Migration adds 3 permissions per Scheduler role
- Idempotent migration (safe to re-run)

### Backend Layer

- Business validation in `TelemedicineService`
- Role-based permission checks
- Enhanced audit logging with role context
- Existing guards handle permission enforcement

### Frontend Layer

- Conditional UI rendering based on permissions
- Telemedicine-specific form fields
- Permission hook for access control
- Responsive design for mobile/tablet

## Security Considerations

### Permission Enforcement

- Server-side validation (cannot be bypassed)
- Scheduler cannot self-assign as clinician
- Scheduler cannot access clinical actions
- Dual-role users handled correctly

### Audit Trail

- All actions logged with role context
- Tracks who (by role) performed each action
- Supports compliance and security reviews
- Failed audit writes don't break operations

### Data Privacy

- Schedulers only see appointment data
- No access to clinical notes or prescriptions
- Facility isolation maintained
- RBAC enforced at all layers

## Testing Strategy

### Unit Tests

- Backend validation logic
- Role detection and enforcement
- Audit logging with role context
- Frontend component behavior

### Integration Tests

- Form submission with API
- Permission-based UI rendering
- Error handling and validation
- Loading states and edge cases

### E2E Tests

- Complete scheduler workflow
- Physician workflow unchanged
- Permission enforcement
- Error scenarios

### Manual QA

- Cross-browser testing
- Mobile responsiveness
- Accessibility compliance
- User experience validation

## Success Metrics

### Functional

- [ ] Schedulers can book telemedicine appointments
- [ ] Schedulers cannot perform clinical actions
- [ ] Physician workflow unchanged
- [ ] All tests pass (unit, integration, E2E)
- [ ] No breaking changes

### Performance

- [ ] API response time < 500ms
- [ ] UI renders in < 100ms
- [ ] E2E tests complete in < 5 minutes
- [ ] No performance degradation

### Quality

- [ ] Code coverage > 80%
- [ ] Zero critical bugs
- [ ] Accessibility score > 95
- [ ] Security scan passes

## Rollback Plan

### If Issues Arise

1. **Database Rollback:**

   ```sql
   -- Run rollback SQL from SCH-BE-01
   DELETE FROM role_permissions
   WHERE role_id IN (SELECT id FROM roles WHERE name = 'Scheduler')
   AND module = 'telemedicine';
   ```

2. **Frontend Rollback:**
   - Revert frontend deployment
   - Telemedicine option hidden from schedulers
   - Existing appointments remain accessible

3. **Backend Rollback:**
   - Revert backend deployment
   - Validation logic removed
   - Audit logging reverts to previous version

### Zero Downtime

- Migration is additive (no data loss)
- Frontend changes are backward compatible
- Backend validation is opt-in
- Can rollback without affecting existing data

## Documentation Updates

### User Documentation

- Update scheduler training materials
- Add telemedicine booking guide
- Update workflow diagrams
- Create video tutorial

### Technical Documentation

- Update RBAC permission matrix
- Document new audit log fields
- Update API documentation
- Add troubleshooting guide

### Compliance Documentation

- Update audit trail documentation
- Document role-based access controls
- Update security policies
- Create compliance report template

## Stakeholder Communication

### Before Implementation

- [ ] Present plan to stakeholders
- [ ] Get approval from security team
- [ ] Notify schedulers of upcoming feature
- [ ] Schedule training sessions

### During Implementation

- [ ] Daily standup updates
- [ ] Demo to stakeholders (staging)
- [ ] Collect feedback
- [ ] Adjust based on input

### After Deployment

- [ ] Announce feature launch
- [ ] Provide training materials
- [ ] Monitor usage and feedback
- [ ] Address issues promptly

## Risk Mitigation

| Risk                    | Impact | Probability | Mitigation                              |
| ----------------------- | ------ | ----------- | --------------------------------------- |
| Permission bypass       | High   | Low         | Server-side validation, security review |
| Performance degradation | Medium | Low         | Load testing, monitoring                |
| User confusion          | Medium | Medium      | Training, clear UI, help text           |
| Audit log failure       | Low    | Low         | Non-blocking logging, error handling    |
| Rollback needed         | Medium | Low         | Comprehensive testing, staged rollout   |

## Post-Deployment Monitoring

### Metrics to Track

- Telemedicine appointments booked by schedulers
- Error rates for appointment creation
- API response times
- User feedback and support tickets
- Audit log volume and patterns

### Alerts

- Permission errors > 5 per hour
- API response time > 1 second
- Failed appointment creations > 10%
- Audit logging failures

### Review Schedule

- Day 1: Hourly monitoring
- Week 1: Daily review
- Month 1: Weekly review
- Ongoing: Monthly review

## Conclusion

This implementation enables schedulers to book telemedicine appointments while maintaining strict separation between administrative and clinical roles. The solution is secure, well-tested, and maintains backward compatibility with existing workflows.

**Next Steps:**

1. Review and approve this plan
2. Assign tickets to developers
3. Begin implementation with SCH-BE-01
4. Follow the phased rollout plan
5. Monitor and iterate based on feedback
