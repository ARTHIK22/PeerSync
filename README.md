<<<<<<< HEAD
# PeerSync

PeerSync is a static student collaboration prototype built with HTML, CSS, and vanilla JavaScript. Open `index.html` with VS Code Live Server to explore the landing page and account flow.

## Phase 2 authentication demo

- `register.html` validates the student fields, checks password strength and confirmation, and prevents duplicate normalized email addresses.
- `login.html` checks the credentials saved by registration. “Remember me” saves the demo session between browser restarts; without it, the session is kept in `sessionStorage` for the current browser tab.
- `dashboard.html` is the protected student workspace, now populated with profile, project, and account data.
- `js/storage.js` owns JSON parsing and writes. `js/auth.js` owns validation, account creation, login, session lookup, logout, and the protected-page check.

## Browser data

Accounts are stored under the LocalStorage key `peersync_users` as an array of records with `id`, `name`, normalized `email`, `password`, `college`, `country`, and `createdAt` fields. Session records use the `peersync_session` key in either SessionStorage or LocalStorage, depending on “Remember me.”

## Phase 3 student profiles

- `profile.html` displays the authenticated student's profile, completion progress, skills, interests, experience, projects, education, links, and collaboration preferences.
- `edit-profile.html` edits the profile. It supports structured skills and proficiency, interests, multiple experience/project entries, image selection, URL validation, and unsaved-change prompts.
- `js/storage.js` stores registered student profiles as a map under `peersync_profiles`, keyed by account ID. Profile records are separate from account credentials; the registered email is read from the account and is not editable.
- `calculateProfileCompletion()` applies the requested section weights: personal information 20%, education 15%, skills 20%, interests 10%, experience 10%, projects 10%, social links 5%, and collaboration preferences 10%. Partial personal and academic fields count proportionally; the remaining sections count when meaningfully populated.
- Twelve sample student profiles are seeded under the separate `peersync_demo_profiles` key. They are marked `isDemo: true`, have no accounts or login credentials, and are not mixed into registered users.

## Phase 4 dashboard

- `dashboard.html` is protected by the existing session check and loads the signed-in student's profile from `peersync_profiles`.
- `js/dashboard.js` reads connections, requests, projects, notifications, and activity from `peersync_connections`, `peersync_requests`, `peersync_projects`, `peersync_notifications`, and `peersync_activities`. Missing lists show zero or an empty state.
- Student suggestions are ranked by counts of shared skills and interests. They do not show compatibility percentages.
- Five sample projects are held separately under `peersync_demo_projects` and labeled as samples. They never enter the student's project list or active project count.
- At the initial Phase 4 release, network, notifications, and settings used a future-phase page. The network and notification center were completed in Phases 7 and 8; settings remain outside this phase scope.
- No activity or request records are fabricated. The dashboard displays only stored activity and incoming request records.

## Phase 5 student discovery and matching

- `discover.html` provides profile search, multi-select filters, sorting, student profile and match dialogs, connection request actions, and project requirement analysis.
- `js/matching.js` is a DOM-independent deterministic engine. Student matches combine skill compatibility (40%), complementary skills (30%), interest compatibility (15%), experience compatibility (10%), and collaboration compatibility (5%). Component scores are normalized to 0–100, then the weighted score is dampened by `0.5 + 0.5 × (the lower profile completion / 100)` so incomplete profiles cannot receive inflated matches.
- Project matches use required skill coverage/proficiency (60%), preferred-role fit (20%), category/interests (10%), and collaboration availability/mode (10%), then a profile-completeness factor. The analyzer reports matched, missing, and additional skills and assigns distinct students to exclusive roles.
- Discovery reads profiles from `PeerStorage.getAllStudentProfiles()`. Search and filters do not write profile data. Public profile dialogs omit account email and credentials.
- Connection requests reuse `peersync_requests`; accepted connections use `peersync_connections`, the same key read by dashboard statistics. New requests also add notification and activity records for the relevant student IDs.
- Sample profiles and projects remain separate from registered users and student-created projects. Sample profiles cannot receive connection requests because they have no account.
- Matching is deterministic JavaScript based on profile fields; it does not call AI or external services. Scores depend on how complete and accurate students' profiles are.

## Phase 6 project hub and management

- `projects.html` searches and filters public projects and offers recommendations using the existing `js/matching.js` project fit model. `create-project.html`, `project-details.html`, and `my-projects.html` support authoring, applications/invitations, team management, and ownership controls.
- `js/project-common.js` contains shared presentation helpers. `js/storage.js` owns project and application persistence and validates project creators, ownership, duplicate membership/application, capacity, and role openings.
- Student projects continue to use `peersync_projects`; applications and invitations are stored as typed records under `peersync_project_applications`. An application is separate from a general connection request, and accepting either an application or invitation adds the student to the project's team.
- Structured projects store creator, requirements, roles/openings, members, timeline, resources, and status. Legacy sample projects remain under `peersync_demo_projects` and are read-only. Notifications and activity reuse `peersync_notifications` and `peersync_activities`.
- The project matcher ranks profile fit using skills and proficiency (55%), role fit (20%), interests/category (10%), experience (5%), and availability/collaboration (10%). Role-specific skills are passed to the existing engine; no random scores or external service are used.
- Project visibility is local-browser simulation only. Storage is not secure, synchronized, or shared across browsers/devices.

## Phase 7 collaboration and communication

- `network.html` and `requests.html` manage accepted connections, incoming/sent requests, cancellations, declines, history, and profile-based compatibility. They reuse `peersync_connections` and `peersync_requests`; Discover now calls the same shared request functions.
- `messages.html` provides direct and project group conversations. `js/collaboration.js` stores conversation records in `peersync_conversations` and message records in `peersync_messages`. Direct conversations require an accepted connection. Project discussions recheck project membership on every access and message action.
- Messages are plain text, limited to 4,000 characters, and rendered with `textContent`. Read status uses `readBy`; local message and conversation deletion use per-user `deletedFor` and `hiddenFor` fields so one student does not erase another student's local view.
- Connection and message notifications reuse `peersync_notifications`; activity reuses `peersync_activities`. Dashboard notification items link to the related request, network, conversation, or project.
- `student-profile.html` provides a public-safe profile view without account email or credentials. Profile links on network, request, and team cards use this page.
- Manual workflow: register two accounts in the same browser, send a request from Discover, switch accounts and accept it in Requests, open Messages from Network, and send a message in both directions. Create a project, add a second account through an application or invitation, open Team Discussion, then leave/remove that member and confirm the group becomes inaccessible to them.
- This prototype stores all collaboration data in browser LocalStorage. It has no server, presence, or real-time synchronization; online indicators are omitted. Conversation deletion hides it for the current user, and message deletion hides that message for the current user. A connection must be accepted again to reopen its preserved direct history.

## Phase 8 notifications and activity center

- `js/notifications.js` is the single notification and activity service. It reuses `peersync_notifications` and `peersync_activities`; per-account preferences are stored in `peersync_notification_preferences`. New events use `createNotification()` and `createActivity()`, deduplicate by event key, and dispatch a local data-change event so open dashboard badges refresh.
- `notifications.html` provides All, Unread, Connections, Messages, Projects, and System filters, individual read/delete actions, mark all as read, clear all with confirmation, and a separate date-grouped activity timeline with Load More. It validates related request, project, conversation, and profile records before showing a destination; missing references display an unavailable state.
- Notification preferences are per user and apply to future event notifications. They do not block connections, messages, applications, or project membership changes. No email or push delivery is used.
- The dashboard notification bell shows the unread count and latest five items, with Mark All as Read and a View All link. Activity history contains actual events written by project, connection, and profile-save workflows; no history is invented for existing accounts.
- Manual checks: create two accounts in one browser, send and accept a connection request, exchange a direct message, apply to and join a project, and verify the recipient updates appear in Notifications. Mark/read/delete/clear items, change a category preference, reload, and verify the count and saved preference. Switch the activity tab and test Load More and a missing reference fallback.
- LocalStorage remains browser-local and editable by the user. These notifications are not server verified, synchronized, or delivered across devices.

## Phase 9 global search and advanced discovery

- `js/search-engine.js` builds one in-memory index from registered student profiles and projects the signed-in student is allowed to see. It does not index sample profiles/projects or account emails. Ranking is deterministic: exact/leading name and title matches score highest, followed by skills, colleges, interests, categories, roles, and descriptive fields. Every query term must match; typo correction and AI ranking are not used.
- `js/global-search.js` adds a keyboard-accessible search overlay and global launch button to the dashboard, Discover, Projects, Network, Notifications, and profile/collaboration pages. It shows per-user recent searches, local popular skills/colleges, and live results. The dashboard quick-search field now opens this same overlay.
- `search.html` supports `q` and `type` URL parameters, category tabs, student and project filters, compatibility/relevance sorting, result counts, and Load More. Student and project compatibility scores come from the existing `js/matching.js` engine. College and skill discoveries are aggregated from registered profiles and visible projects; related skills come from skills co-listed on student profiles, not a generative model.
- Recent and saved queries use `peersync_recent_searches` and `peersync_saved_searches`, each record scoped with `userId`. Recent history is capped at 30 entries per account. Saved searches retain category and filter values and can be reopened, renamed, or deleted; they do not create alerts.
- Manual checks: search a registered peer by full and partial name, college/country, skill, and multiple terms; search a project by title and required skill; combine student/project filters; sort by matching and date; open profile/project/college/skill results; save, reopen, rename, and delete a search; clear one account's recents and confirm another account's remain.
- Search only sees the local browser's registered students and accessible projects. Institution counts and skill popularity are local counts, not global directories or platform-wide totals. Visual browser testing remains a manual step.

## Phase 10 personalized intelligence and recommendations

- `js/intelligence.js` ranks registered student profiles and accessible open projects with the existing Phase 5 `PeerMatching` compatibility scores. Preference ranking is a separate value; the compatibility percentage and its component breakdown remain unchanged. Sample profiles and projects are excluded from recommendations.
- The dashboard shows real student and project recommendations, compatibility, matched/missing skills, pending connection state, and controls to save or dismiss an item. Project recommendations exclude the signed-in student's own/team projects, closed or full projects, and pending/accepted applications.
- `skill-insights.html` shows profile strengths and developing skills, skill gaps inferred from relevant open project requirements, local project skill demand, and collaboration insights. These are exploratory hints based on this browser's data.
- Matching style, component priorities, preferred project categories, roles, collaboration modes, and availability are stored per account in `peersync_recommendation_preferences`. Recommendation feedback is stored per account in `peersync_recommendation_feedback`; saved and dismissed items can be reviewed and restored on Skill Insights.
- Manual checks: create two registered profiles with complementary skills and confirm their match score is unchanged when preference settings change; create open, closed, full, own, and applied-to projects and verify only eligible recommendations show; save/dismiss/restore items, reload, and switch accounts to check isolation. Check narrow mobile layout on Skill Insights.
- Recommendations are deterministic and local. Skill demand counts only registered user profiles and open projects available in this browser; the feature does not use an AI service or claim career outcomes.

## Phase 11 student community and discussion forums

- `community.html` provides feed, own posts, saved posts, own discussions, followed-student feed, trending, category filters, engagement sorting, and Load More. The responsive feed shows real student profile details and supports text posts, questions, showcases, achievements, and discussions.
- `js/community-data.js` stores posts, comments, likes, follows, and bookmarks under separate `peersync_community_*` keys. Each record references the existing user and project IDs. Saves are separate from Phase 10 recommendation feedback. Duplicate likes, bookmarks, and follows are prevented; comments support one reply level.
- The composer supports preview, edit/delete ownership checks, optional title, tags, visibility, project showcase references, and persisted drafts. Project cards resolve current project details and show a safe unavailable message if the original project is gone or inaccessible.
- `discussion.html?id=...` displays the post, chronological comments/replies, and related discussions. Community likes, comments, replies, and follows use the Phase 8 `PeerNotifications` service and respect its system notification preference. Notifications link back to the discussion.
- Phase 9 search indexes public community posts by title, content, category, tags, and author. The Community category is available in both global search and Search & Discover. Connection-only post text is omitted from community search.
- Trending topics use post tags and categories. Their deterministic score is `(1 + 2 × likes + 3 × comments) / sqrt(age in hours)` per post, summed by topic. Feed trending uses the same engagement weights with a recency adjustment; counts and rank come from actual local posts.
- Manual workflow: create two accounts, publish a question and a showcase linked to an existing project, then switch accounts to like, comment, reply, follow, save, and search. Verify ownership restrictions, visibility, notifications, refresh persistence, and restored content after unfollow/unsave. Resize to mobile and verify the feed becomes single-column.
- This is a local browser prototype. LocalStorage can be edited or cleared by the user; ownership and visibility checks are frontend checks and do not provide production security or cross-device data sharing.

## Phase 12 administration and moderation

- `admin-login.html` and the protected `admin-dashboard.html`, `admin-students.html`, `admin-projects.html`, `admin-community.html`, and `admin-reports.html` pages provide a separate demo-admin workspace. `js/admin-auth.js` stores a short-lived session in SessionStorage. Demo credentials are `admin@peersync.local` / `PeerSyncAdmin2026!`; the credentials and all role checks are public client code and are not secure.
- `js/admin-data.js` reads existing students, projects, applications, connections, community posts/comments, and notifications. It adds `peersync_account_statuses`, `peersync_platform_settings`, `peersync_reports`, `peersync_moderation_history`, and `peersync_admin_activity`. Removing a student removes the account and profile but retains authored projects/posts and their existing references.
- Students can report profiles, projects, posts, and comments from their respective pages. Reports retain status history and administrative notes. Report submission does not automatically suspend an account. Post/comment removal records the original content and reason and can be restored from the moderation workspace.
- Platform settings persist in LocalStorage. Registration, project creation, community posting, maximum post length, maximum project description length, and maintenance mode are enforced in their existing frontend entry points. Existing signed-in students are not logged out by maintenance mode.
- Suspended accounts cannot sign in and the existing connection, project-creation, profile update, and community actions are restricted through local account status checks. Admin notifications use the Phase 8 notification service and respect the system notification preference.
- Overview counts are calculated from current LocalStorage records. Registration charts only include users with parseable creation dates. No active-student count is inferred from absent presence data; the displayed active account count means accounts not marked suspended.
- Manual workflow: use the demo credential, inspect student/project/community tables, suspend and reactivate a student, test the student login/action restriction, submit a report from a profile/project/post/comment, change its status, remove and restore community content, update settings and try the corresponding student workflows, inspect the audit log, then sign out. Verify admin pages redirect when the demo session is absent and test the layouts at mobile width.
- This administration interface is strictly a browser prototype. It has no trusted server, secure admin identity, durable audit log, or server-enforced permissions. Anyone who can edit LocalStorage or JavaScript can bypass it; do not use it to manage real users or sensitive records.

## Phase 13 analytics and insights

- `admin-analytics.html` adds aggregate platform analytics to the admin sidebar. It supports 7, 30, and 90 day ranges, all time, and inclusive custom dates. SVG line, bar, and doughnut charts cover student registrations and active students, project status and category, profile completion, connections, applications, messages, community posts, comments and reactions, and current student interests and skills. The report view prints through the browser; CSV export contains aggregate statistics only.
- `my-insights.html` is linked from the student dashboard. It requires an authenticated account and the analytics module returns personal data only when the requested student ID matches the current session. It summarizes profile completion, connections and pending requests, created and joined projects, application outcomes, posts and comments, messages, saved recommendations, skill proficiency and category, complementary skill areas, and profile development suggestions.
- `js/analytics.js` reuses existing LocalStorage records and calculates aggregates on demand; it adds only `peersync_analytics_events` for feature actions that lack an equivalent event record. Submitted searches record the search type and timestamp, never the query. Opening another student's profile records a view once per viewer, target, and browser tab session. Newly added profile skills are timestamped as events; older skills without timestamps are excluded from emerging skill trends. Existing dated posts, comments, applications, project creation, connection requests, and messages are counted directly from their canonical records.
- Date filters include timestamped records only. Profile completion, preferences, current project status, skill distribution, and other profile fields are current snapshots; the page labels this limitation. Undated legacy records are excluded from period trends rather than assigned a made-up date. Active-student counts mean distinct accounts with at least one timestamped action in the selected period. A period with no available action history is labeled unavailable. Skill complementarity uses the existing deterministic Phase 5 matching function, aggregated across profile pairs.
- Manual workflow: sign in as demo admin, open Analytics & insights, switch date ranges and try a valid/invalid custom range, export the aggregate CSV, then print the report. Sign in as a student and open My insights; verify that another account cannot be requested by changing its user ID in the page script/API. Search once and confirm that an event is added without a query string. Resize both pages to narrow width.
- Analytics run entirely in this browser and can be edited with developer tools. They are descriptive summaries, not predictions, and do not represent cross-device or server analytics. Historical coverage depends on records that already have timestamps.

## Security limitations

This is a college frontend prototype, not production authentication. The browser stores passwords as plain text, and users can inspect or change LocalStorage and bypass client-side checks. Do not use a real password or personal data. There is no server, email delivery, password reset, global account sharing, or cross-device synchronization. The Forgot Password interface explains that no reset email can be sent.

## Run locally

Open the project folder in VS Code, install or enable Live Server, then right-click `index.html` and choose **Open with Live Server**. No build step or package installation is required.
=======
# PeerSync
>>>>>>> 10ed5f5e4ffd201d3e3ce83f40eef948d60aaeb5
