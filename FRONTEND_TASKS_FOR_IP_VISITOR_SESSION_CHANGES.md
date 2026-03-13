# Frontend Tasks for IP-Based Visitor Identity & Session Snoozing Changes

## Overview

Based on the recent backend changes implementing IP-based visitor identity resolution and session lifecycle management with snoozing capabilities, the frontend needs to be updated to work with the new backend architecture. The backend now automatically resolves visitor identity from IP addresses and manages session states (ACTIVE, SNOOZED, INACTIVE).

## Key Backend Changes Summary

1. **IP-Based Visitor Resolution**: Backend now automatically creates/resolves visitors from IP addresses
2. **Session Lifecycle Management**: Sessions have states (ACTIVE, SNOOZED, INACTIVE) with automatic transitions
3. **Profile Persistence**: User profile data (name, email, phone) is now stored on Visitor model, not session
4. **Session Snoozing**: Sessions automatically snooze after 4 minutes of inactivity and become inactive after 24 hours
5. **Automatic Cleanup**: Inactive sessions are automatically cleaned up after 30 days
6. **No Frontend visitor_id Required**: Backend resolves visitor identity automatically from IP

## Frontend Task List

### Phase 1: Remove visitor_id Dependencies (High Priority)

#### Task 1.1: Update API Request Structure
- **File**: `staticfiles/widget/widget.js` (minified - need source)
- **Description**: Remove `visitor_id` from all API requests to backend
- **Changes**:
  - Remove `visitor_id` parameter from chat message requests
  - Remove `visitor_id` from session creation requests
  - Update request payload structure for both REST API and WebSocket
- **Impact**: Backend now resolves visitor automatically from IP address
- **Testing**: Verify chat functionality works without sending visitor_id

#### Task 1.2: Update WebSocket Connection Logic
- **File**: `staticfiles/widget/widget.js`
- **Description**: Simplify WebSocket connection - no need to send visitor_id
- **Changes**:
  - Remove visitor_id from WebSocket connection parameters
  - Update connection handshake logic
  - Handle new connection response format that includes resolved visitor_id
- **Impact**: WebSocket connections will be simpler and more reliable
- **Testing**: Verify WebSocket connections establish correctly

#### Task 1.3: Update Session Creation Flow
- **File**: `staticfiles/widget/widget.js`
- **Description**: Simplify session creation - backend handles visitor resolution
- **Changes**:
  - Remove visitor creation step from frontend
  - Update session creation API calls to not include visitor_id
  - Handle backend response that includes both session_id and resolved visitor_id
- **Impact**: Faster session initialization, no frontend visitor management
- **Testing**: Verify new sessions are created successfully

### Phase 2: Handle New Session States (High Priority)

#### Task 2.1: Add Session State Handling
- **File**: `staticfiles/widget/widget.js`
- **Description**: Handle new session states (ACTIVE, SNOOZED, INACTIVE)
- **Changes**:
  - Add logic to handle session state in responses
  - Display appropriate UI states for different session statuses
  - Handle session reactivation when user returns to SNOOZED session
- **Impact**: Better user experience with clear session status indication
- **Testing**: Test session state transitions and UI updates

#### Task 2.2: Handle Session Reactivation
- **File**: `staticfiles/widget/widget.js`
- **Description**: Handle automatic session reactivation for SNOOZED sessions
- **Changes**:
  - Detect when backend reactivates a SNOOZED session
  - Update UI to show session is active again
  - Handle any state synchronization needed
- **Impact**: Seamless user experience when returning to snoozed conversations
- **Testing**: Test returning to snoozed sessions after inactivity

#### Task 2.3: Handle Inactive Session Errors
- **File**: `staticfiles/widget/widget.js`
- **Description**: Handle INACTIVE session errors gracefully
- **Changes**:
  - Detect when session is INACTIVE and cannot be used
  - Show appropriate error message to user
  - Provide option to start new session
  - Clear local session data for inactive sessions
- **Impact**: Clear user feedback when sessions expire
- **Testing**: Test behavior when trying to use inactive sessions

### Phase 3: Update Profile Data Handling (Medium Priority)

#### Task 3.1: Update Profile Data Storage
- **File**: `staticfiles/widget/widget.js`
- **Description**: Update how profile data is handled (now stored on visitor, not session)
- **Changes**:
  - Remove profile data from session-level storage
  - Handle profile data from visitor_profile in API responses
  - Update profile collection forms to work with new backend structure
- **Impact**: Profile data persists across sessions for same visitor
- **Testing**: Verify profile data persists across multiple sessions

#### Task 3.2: Handle Pre-populated Profile Data
- **File**: `staticfiles/widget/widget.js`
- **Description**: Handle pre-populated profile data for returning visitors
- **Changes**:
  - Check for existing profile data in session creation response
  - Pre-populate forms with existing visitor profile data
  - Show appropriate UI when profile data already exists
- **Impact**: Better user experience for returning visitors
- **Testing**: Test profile pre-population for returning visitors

### Phase 4: Handle New Message Types (Medium Priority)

#### Task 4.1: Handle Idle Warning Messages
- **File**: `staticfiles/widget/widget.js`
- **Description**: Handle new idle_warning message type from backend
- **Changes**:
  - Add handler for 'idle_warning' message type
  - Display idle warning messages in chat UI
  - Add appropriate styling for warning messages
  - Handle idle warning metadata
- **Impact**: Users get notified when session is about to timeout
- **Testing**: Test idle warning display after 2 minutes of inactivity

#### Task 4.2: Handle Session End Messages
- **File**: `staticfiles/widget/widget.js`
- **Description**: Handle new session_end message type from backend
- **Changes**:
  - Add handler for 'session_end' message type
  - Display session end messages appropriately
  - Handle connection closure after session end
  - Show option to start new session
- **Impact**: Clear indication when sessions end due to inactivity
- **Testing**: Test session end behavior after 4 minutes of inactivity

#### Task 4.3: Update Message Schema Handling
- **File**: `staticfiles/widget/widget.js`
- **Description**: Update to handle new standardized message schema
- **Changes**:
  - Update message parsing to handle new schema fields
  - Handle new metadata fields in messages
  - Update message display logic for new message types
- **Impact**: Consistent message handling across all message types
- **Testing**: Verify all message types display correctly

### Phase 5: Update Previous Chats/Session History (Medium Priority)

#### Task 5.1: Update Session History Display
- **File**: `staticfiles/widget/widget.js`
- **Description**: Update previous chats to work with new session filtering
- **Changes**:
  - Remove client-side session filtering (backend now handles this)
  - Handle new session status information in previous chats
  - Update UI to show session states if needed
- **Impact**: Previous chats automatically exclude inactive sessions
- **Testing**: Verify previous chats only show active/snoozed sessions

#### Task 5.2: Handle Session Status in History
- **File**: `staticfiles/widget/widget.js`
- **Description**: Display session status in chat history if relevant
- **Changes**:
  - Add visual indicators for session status in history
  - Handle resuming snoozed sessions from history
  - Update history refresh logic
- **Impact**: Users can see and resume snoozed conversations
- **Testing**: Test session history with different session states

### Phase 6: Error Handling & User Experience (Low Priority)

#### Task 6.1: Improve Error Messages
- **File**: `staticfiles/widget/widget.js`
- **Description**: Update error handling for new backend error types
- **Changes**:
  - Add specific error handling for session state errors
  - Improve error messages for IP resolution issues
  - Add retry logic for transient errors
- **Impact**: Better user experience with clearer error messages
- **Testing**: Test various error scenarios

#### Task 6.2: Add Loading States
- **File**: `staticfiles/widget/widget.js`
- **Description**: Add loading states for session operations
- **Changes**:
  - Add loading indicators for session creation
  - Add loading states for session reactivation
  - Improve overall loading experience
- **Impact**: Better perceived performance and user feedback
- **Testing**: Test loading states in various scenarios

#### Task 6.3: Update Widget Configuration
- **File**: `staticfiles/widget/widget-loader.js`
- **Description**: Update widget configuration for new backend requirements
- **Changes**:
  - Remove any visitor_id configuration options
  - Update API endpoint configurations if needed
  - Add any new configuration options for session management
- **Impact**: Simplified widget configuration
- **Testing**: Test widget initialization with new configuration

### Phase 7: Testing & Validation (High Priority)

#### Task 7.1: Cross-Browser Testing
- **Description**: Test all changes across different browsers
- **Changes**:
  - Test IP resolution works correctly across browsers
  - Test WebSocket connections in different browsers
  - Verify session management works consistently
- **Impact**: Consistent experience across all browsers
- **Testing**: Comprehensive browser compatibility testing

#### Task 7.2: Mobile Device Testing
- **Description**: Test changes on mobile devices
- **Changes**:
  - Test IP resolution on mobile networks
  - Test session persistence on mobile
  - Verify touch interactions work correctly
- **Impact**: Good mobile user experience
- **Testing**: Test on various mobile devices and networks

#### Task 7.3: Network Condition Testing
- **Description**: Test under various network conditions
- **Changes**:
  - Test with slow connections
  - Test with intermittent connectivity
  - Test session recovery after network issues
- **Impact**: Robust performance under poor network conditions
- **Testing**: Test with network throttling and interruptions

### Phase 8: Documentation & Deployment (Low Priority)

#### Task 8.1: Update Widget Documentation
- **File**: Create new documentation files
- **Description**: Update widget integration documentation
- **Changes**:
  - Remove visitor_id from integration examples
  - Update API documentation for new endpoints
  - Add session lifecycle documentation
- **Impact**: Easier widget integration for developers
- **Testing**: Verify documentation examples work

#### Task 8.2: Update Widget Examples
- **File**: Create example files
- **Description**: Update integration examples
- **Changes**:
  - Create new integration examples without visitor_id
  - Add examples for handling session states
  - Update configuration examples
- **Impact**: Better developer experience
- **Testing**: Test all example code

## Implementation Priority

### Immediate (Week 1)
- Task 1.1: Remove visitor_id from API requests
- Task 1.2: Update WebSocket connection logic
- Task 1.3: Update session creation flow
- Task 2.3: Handle inactive session errors

### High Priority (Week 2)
- Task 2.1: Add session state handling
- Task 2.2: Handle session reactivation
- Task 4.3: Update message schema handling
- Task 7.1: Cross-browser testing

### Medium Priority (Week 3)
- Task 3.1: Update profile data storage
- Task 3.2: Handle pre-populated profile data
- Task 4.1: Handle idle warning messages
- Task 4.2: Handle session end messages

### Low Priority (Week 4)
- Task 5.1: Update session history display
- Task 5.2: Handle session status in history
- Task 6.1: Improve error messages
- Task 6.2: Add loading states

## Technical Considerations

### API Changes
- **Remove**: `visitor_id` from all requests
- **Add**: Handle `visitor_profile` in responses
- **Update**: Message schema handling for new message types

### WebSocket Changes
- **Simplify**: Connection establishment (no visitor_id needed)
- **Add**: Handlers for `idle_warning` and `session_end` message types
- **Update**: Message parsing for new standardized schema

### State Management
- **Remove**: Client-side visitor management
- **Add**: Session state tracking (ACTIVE, SNOOZED, INACTIVE)
- **Update**: Profile data handling (visitor-level, not session-level)

### Error Handling
- **Add**: Session state error handling
- **Update**: Error messages for new error types
- **Improve**: Recovery mechanisms for session issues

## Testing Strategy

### Unit Tests
- Test API request/response handling
- Test message parsing and display
- Test error handling scenarios

### Integration Tests
- Test complete chat flows
- Test session lifecycle scenarios
- Test profile data persistence

### User Acceptance Tests
- Test user experience with session snoozing
- Test profile data persistence across sessions
- Test error recovery scenarios

## Rollback Plan

### If Issues Arise
1. **Immediate**: Revert to previous widget version
2. **Backend**: Ensure backward compatibility maintained
3. **Gradual**: Phase rollout to subset of users first
4. **Monitoring**: Monitor error rates and user feedback

### Compatibility
- Ensure new frontend works with updated backend
- Maintain graceful degradation for edge cases
- Test with various network conditions and devices

## Success Metrics

### Technical Metrics
- Reduced API request complexity (no visitor_id management)
- Improved session success rates
- Reduced frontend error rates

### User Experience Metrics
- Faster session initialization
- Better profile data persistence
- Clearer session status communication
- Improved idle timeout handling

## Notes

1. **Source Code**: The current `widget.js` is minified. Need access to source code to implement changes.
2. **Testing**: Extensive testing required due to fundamental changes in session management.
3. **Backward Compatibility**: Ensure changes don't break existing integrations.
4. **Documentation**: Update all integration documentation to reflect new simplified approach.
5. **Monitoring**: Add monitoring for new session states and error conditions.

This task list provides a comprehensive roadmap for updating the frontend to work with the new IP-based visitor identity resolution and session snoozing backend implementation.