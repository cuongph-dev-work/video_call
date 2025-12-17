# User Stories - Video Call Application

**Project**: Video Call Application  
**Last Updated**: 2025-12-17  
**Version**: 1.0

---

## Table of Contents

1. [Epic 1: Khởi tạo và Tham gia Phòng họp](#epic-1-khởi-tạo-và-tham-gia-phòng-họp)
2. [Epic 2: Trải nghiệm trong cuộc họp](#epic-2-trải-nghiệm-trong-cuộc-họp)
3. [Epic 3: WebRTC Communication](#epic-3-webrtc-communication)
4. [Epic 4: Chat System](#epic-4-chat-system)
5. [Epic 5: Room Settings & Security](#epic-5-room-settings--security)
6. [Epic 6: Waiting Room](#epic-6-waiting-room)
7. [Epic 7: Recording](#epic-7-recording)
8. [Epic 8: Screen Sharing](#epic-8-screen-sharing)
9. [Epic 9: Authentication](#epic-9-authentication)

---

## Epic 1: Khởi tạo và Tham gia Phòng họp

### US-1.0: Bắt buộc cài đặt username (Phase hiện tại - No Auth)

**As a** người dùng lần đầu  
**I want to** phải cài đặt username trước khi sử dụng app  
**So that** tôi có identity trong các cuộc họp mà không cần đăng ký tài khoản

**Acceptance Criteria:**
- [ ] Khi user vào app lần đầu (chưa có username trong localStorage), hiển thị màn hình setup username
- [ ] Không cho phép access home page hoặc bất kỳ page nào nếu chưa có username
- [ ] Username validation:
  - Bắt buộc phải nhập (không để trống)
  - Độ dài: 2-30 ký tự
  - Chỉ cho phép chữ cái, số và dấu space
  - Không cho phép ký tự đặc biệt (!@#$%^&*()_+-=[]{}|;:',.<>?/~`)
  - Trim khoảng trắng đầu/cuối
- [ ] Username được lưu vào localStorage
- [ ] Hiển thị error message rõ ràng khi validation fail
- [ ] Sau khi setup thành công, redirect đến home page
- [ ] Có option "Change username" trong settings để đổi sau

**Technical Notes:**
- Validation regex: `/^[a-zA-Z0-9\s]{2,30}$/`
- Storage key: `localStorage.getItem('username')`
- Component: Setup username page/modal
- Check username tồn tại trên app layout hoặc middleware

**Phase Notes:**
> ⚠️ **Phase hiện tại**: Không yêu cầu authentication/login. Username được lưu local và không sync với backend. Epic 9 (Authentication) sẽ được implement ở phase sau.

---

### US-1.1: Tạo cuộc họp mới

**As a** người dùng  
**I want to** tạo một cuộc họp mới với một click  
**So that** tôi có thể bắt đầu cuộc họp ngay lập tức mà không cần cấu hình phức tạp

**Acceptance Criteria:**
- [ ] Khi click "Cuộc họp mới" trên trang chủ, hệ thống tự động tạo room ID duy nhất
- [ ] Room ID format: `XX-XXXX-XX` (8 chữ cái IN HOA, ví dụ: "AB-CDEF-GH")
- [ ] Room ID được hiển thị rõ ràng và có thể sao chép
- [ ] Người tạo phòng tự động trở thành host
- [ ] Chuyển hướng người dùng đến trang pre-join

**Technical Notes:**
- Room ID format: `XX-XXXX-XX` (Google Meet style, ví dụ: "AB-CDEF-GH")
- Chỉ sử dụng chữ cái IN HOA (A-Z) để dễ đọc và giao tiếp bằng lời
- Room ID được tạo bằng `generateMeetingCode()` trong utils package
- Room được lưu trong Redis với TTL 24 giờ
- Backend: `RoomsService.createRoom()`

---

### US-1.2: Tham gia phòng họp bằng mã

**As a** người dùng  
**I want to** tham gia phòng họp bằng cách nhập mã phòng  
**So that** tôi có thể tham gia cuộc họp mà người khác đã tạo

**Acceptance Criteria:**
- [ ] Input field để nhập mã phòng (format: XX-XXXX-XX)
- [ ] Validation: chấp nhận 8 chữ cái (A-Z) với hoặc không có dấu gạch ngang
- [ ] Auto-format: tự động thêm dấu gạch ngang khi user nhập (AB-CDEF-GH)
- [ ] Case-insensitive: chấp nhận cả chữ thường, tự động convert sang IN HOA
- [ ] Hiển thị lỗi nếu mã phòng không đúng format hoặc không tồn tại
- [ ] Chuyển đến trang pre-join nếu mã hợp lệ

---

### US-1.3: Pre-join - Kiểm tra thiết bị

**As a** người dùng  
**I want to** kiểm tra camera và microphone trước khi tham gia  
**So that** tôi đảm bảo thiết bị hoạt động tốt trước khi vào phòng

**Acceptance Criteria:**
- [ ] Hiển thị video preview từ camera
- [ ] Hiển thị trạng thái microphone (có hoạt động hay không)
- [ ] Có thể toggle audio/video on/off trước khi join
- [ ] Preview video được mirror (hiệu ứng gương)
- [ ] Hiển thị các thiết bị khả dụng (microphone, camera, speaker)
- [ ] Cho phép chọn thiết bị khác nhau từ dropdown

**Technical Notes:**
- Component: `apps/web/domains/room/components/PreJoinScreen.tsx` (extracted from `pre-join/page.tsx`)
- Hook: `useLocalStream()` để quản lý media stream
- Sử dụng `getUserMedia()` API

---

### US-1.4: Pre-join - Cài đặt display name

**As a** người dùng  
**I want to** xem và cập nhật username trên pre-join page  
**So that** tôi có thể đổi tên nếu cần trước khi vào phòng

**Acceptance Criteria:**
- [ ] Pre-join page **bắt buộc** hiển thị trước khi vào phòng
- [ ] Input field hiển thị username đã lưu từ localStorage
- [ ] Cho phép edit username với cùng validation rules như US-1.0:
  - 2-30 ký tự
  - Chỉ chữ cái, số và space
  - Không có ký tự đặc biệt
- [ ] Hiển thị error realtime khi nhập sai format
- [ ] Button "Join" bị disable nếu username invalid
- [ ] Username được update vào localStorage khi thay đổi
- [ ] Không cho phép join nếu username trống hoặc invalid

**Validation Rules:**
```javascript
// Username format
const isValidUsername = (name: string) => {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  return /^[a-zA-Z0-9\s]+$/.test(trimmed);
};
```

**Error Messages:**
- "Username must be 2-30 characters"
- "Username can only contain letters, numbers and spaces"
- "Username cannot be empty"

---

### US-1.5: Khởi tạo cuộc họp với tùy chọn

**As a** người dùng (host)  
**I want to** cấu hình cuộc họp trước khi tạo  
**So that** tôi có thể đặt tên, lên lịch và thiết lập quyền hạn cho người tham gia ngay từ đầu

**Acceptance Criteria:**
- [ ] Khi bấm "Cuộc họp mới", hiển thị modal "Cài đặt cuộc họp" (thay vì tạo ngay)
- [ ] **Modal Info**:
  - [ ] Input "Tên cuộc họp" (Optional, default: "Cuộc họp của [Name]")
  - [ ] Radio button "Thời gian":
    - [ ] "Ngay bây giờ" (default) -> Tạo và join ngay
    - [ ] "Sử dụng sau" -> Hiển thị date/time picker để lên lịch
- [ ] **Modal Permissions** (Settings):
  - [ ] Checkbox "Cho phép tham gia trước chủ phòng" (Allow join before host)
  - [ ] Checkbox "Cho phép mở camera" (Default: checked)
  - [ ] Checkbox "Cho phép mở micro" (Default: checked)
- [ ] Button "Tạo cuộc họp" để confirm
- [ ] Nếu chọn "Ngay bây giờ", redirect vào pre-join/room
- [ ] Nếu chọn "Sử dụng sau", generate link và hiển thị màn hình "Đã lên lịch" với nút copy link

**Technical Notes:**
- Sử dụng `CreateMeetingModal` component.
- Lưu trữ thông tin cuộc họp (hiển thị thông báo thành công bằng toast).
- Sử dụng bộ UI components chung (`shared/components/ui`) bao gồm: `Calendar` (react-day-picker), `Popover` (radix-ui), `Select` (radix-ui) cho trải nghiệm nhất quán.
- Tách biệt quyền Camera và Micro thành 2 toggle riêng.
- "Ngay bây giờ" sẽ tạo phòng và redirect sang trang pre-join.
- Component: `CreateMeetingModal`
- State: `meetingConfig` object
- Service: `RoomsService.createRoom(config)` -> lưu settings vào waiting room/room config
- Date picker: sử dụng native `datetime-local` hoặc library

---

## Epic 2: Trải nghiệm trong cuộc họp

### US-2.1: Hiển thị video grid layout

**As a** người tham gia  
**I want to** xem video của tất cả người tham gia trong layout lưới  
**So that** tôi có thể thấy mọi người cùng lúc

**Acceptance Criteria:**
- [ ] Hiển thị main speaker ở video chính (lớn)
- [ ] Hiển thị thumbnail của 4 người tham gia khác ở dưới
- [ ] Layout tự động điều chỉnh theo số lượng người tham gia
- [ ] Video tiles hiển thị tên người tham gia
- [ ] Hiển thị indicator khi mic/camera tắt

**Technical Notes:**
- Component: `VideoSection`, `ThumbnailGrid`
- Layout responsive với grid CSS

---

### US-2.2: Room header với thông tin cuộc họp

**As a** người tham gia  
**I want to** xem thông tin cơ bản về cuộc họp  
**So that** tôi biết đang tham gia cuộc họp nào

**Acceptance Criteria:**
- [ ] Hiển thị tên cuộc họp
- [ ] Hiển thị ngày/giờ
- [ ] Hiển thị room code (có thể copy)
- [ ] Hiển thị avatar của một vài người tham gia đầu tiên
- [ ] Hiển thị tên người đang nói (current speaker)
- [ ] Nút mở room settings

**Technical Notes:**
- Component: `RoomHeader/`
- Sub-components: `MeetingInfo`, `RoomCodeBadge`, `ParticipantStack`

---

### US-2.3: Control bar - Điều khiển media

**As a** người tham gia  
**I want to** bật/tắt microphone và camera  
**So that** tôi kiểm soát được khi nào mình xuất hiện trong cuộc họp

**Acceptance Criteria:**
- [ ] Button toggle microphone với visual feedback
- [ ] Button toggle camera với visual feedback
- [ ] Trạng thái được đồng bộ với tất cả người tham gia
- [ ] Icon thay đổi khi bật/tắt (Mic/MicOff, Video/VideoOff)
- [ ] Button có màu đỏ khi tắt để dễ nhận biết
- [ ] Hotkey: Space để mute/unmute, V để toggle video

**Technical Notes:**
- Component: `ControlBar/`
- Hooks: `useLocalStream` với `toggleAudio()`, `toggleVideo()`
- Socket events: `toggle-audio`, `toggle-video`

---

### US-2.4: End call

**As a** người tham gia  
**I want to** rời khỏi cuộc họp  
**So that** tôi kết thúc tham gia khi xong việc

**Acceptance Criteria:**
- [ ] Button "End Call" màu đỏ nổi bật
- [ ] Click button sẽ:
  - Dừng local stream
  - Emit leave-room event
  - Close tất cả peer connections
  - Redirect về trang chủ
- [ ] Notify người khác rằng user đã rời phòng

**Technical Notes:**
- Method: `handleEndCall()` trong room page
- Cleanup: stop streams, disconnect socket, close peers

---

### US-2.5: Participants sidebar

**As a** người tham gia  
**I want to** xem danh sách tất cả người trong phòng  
**So that** tôi biết ai đang tham gia và trạng thái của họ

**Acceptance Criteria:**
- [ ] Sidebar bên phải hiển thị danh sách participants
- [ ] Mỗi người hiển thị:
  - Avatar (hoặc initial)
  - Display name
  - "(You)" nếu là chính mình
  - Icon mic nếu bị mute
  - Icon camera nếu tắt video
- [ ] Highlight host (nếu có)
- [ ] Có thể toggle sidebar mở/đóng

**Technical Notes:**
- Component: `Sidebar/ParticipantsPanel`
- State management: participants array với audio/video status

---

## Epic 3: WebRTC Communication

### US-3.1: Thiết lập peer connection

**As a** hệ thống  
**I want to** tự động thiết lập kết nối WebRTC giữa các peers  
**So that** video/audio có thể truyền trực tiếp giữa người dùng

**Acceptance Criteria:**
- [ ] Khi user mới join, tự động tạo peer connection
- [ ] Exchange SDP offer/answer qua signaling server
- [ ] Exchange ICE candidates
- [ ] Hiển thị remote stream khi connection thành công
- [ ] Auto-reconnect nếu connection bị mất
- [ ] Cleanup connection khi user leave

**Technical Notes:**
- Hook: `usePeerConnection()`
- Mesh topology: mỗi peer kết nối trực tiếp với nhau
- Sử dụng STUN server để NAT traversal
- Socket events: `offer`, `answer`, `ice-candidate`

---

### US-3.2: Handle multiple peers

**As a** hệ thống  
**I want to** quản lý kết nối với nhiều peers cùng lúc  
**So that** hỗ trợ cuộc họp nhiều người

**Acceptance Criteria:**
- [ ] Map để quản lý nhiều RTCPeerConnection
- [ ] Mỗi peer có ID riêng (socket.id)
- [ ] Khi user mới join, tạo offer cho user đó
- [ ] Khi user leave, cleanup connection tương ứng
- [ ] Hỗ trợ tối đa 9 người (mesh topology limit)

**Technical Notes:**
- `peersRef.current: Map<string, RTCPeerConnection>`
- Prevent race conditions với `pendingOffersRef`

---

### US-3.3: Media stream quality

**As a** người dùng  
**I want to** video/audio có chất lượng tốt  
**So that** trải nghiệm cuộc họp smooth và rõ ràng

**Acceptance Criteria:**
- [ ] Video resolution: 720p (1280x720)
- [ ] Frame rate: 30 fps
- [ ] Audio: noise cancellation enabled
- [ ] Auto-adjust quality dựa trên bandwidth
- [ ] Hiển thị connection quality indicator

**Technical Notes:**
- Config: `lib/webrtc-config.ts`
- Media constraints cho `getUserMedia()`

---

## Epic 4: Chat System

### US-4.1: Group chat

**As a** người tham gia  
**I want to** gửi tin nhắn đến tất cả mọi người  
**So that** tôi có thể communicate ngay cả khi tắt mic

**Acceptance Criteria:**
- [ ] Chat panel bên phải với tab "Group"
- [ ] Input field để nhập message
- [ ] Button "Send" hoặc Enter để gửi
- [ ] Messages hiển thị theo thời gian
- [ ] Mỗi message hiển thị:
  - Avatar người gửi
  - Tên người gửi
  - Nội dung tin nhắn
  - Timestamp
- [ ] Auto-scroll xuống message mới nhất

**Technical Notes:**
- Component: `Sidebar/ChatPanel`
- Socket event: `chat-message`
- State: `messages` array

---

### US-4.2: Private chat (Future)

**As a** người tham gia  
**I want to** gửi tin nhắn riêng tư cho một người  
**So that** tôi có thể trao đổi mà không làm phiền người khác

**Acceptance Criteria:**
- [ ] Toggle giữa "Group" và "Personal" chat
- [ ] Chọn recipient từ danh sách participants
- [ ] Private messages chỉ visible cho sender và recipient
- [ ] Icon hoặc badge để phân biệt private/group message

**Technical Notes:**
- Socket: `chat-message` với flag `isPrivate: true` và `recipientId`
- Backend đã hỗ trợ trong signaling gateway

---

### US-4.3: Unread badge

**As a** người tham gia  
**I want to** biết khi có tin nhắn mới  
**So that** tôi không bỏ lỡ thông tin quan trọng

**Acceptance Criteria:**
- [ ] Badge number trên chat icon khi có unread messages
- [ ] Clear unread count khi mở chat panel
- [ ] Visual indicator (dot) cho unread messages

---

## Epic 5: Room Settings & Security

### US-5.1: Password protection

**As a** host  
**I want to** đặt mật khẩu cho phòng họp  
**So that** chỉ người có mật khẩu mới join được

**Acceptance Criteria:**
- [ ] Toggle "Require Password" trong room settings
- [ ] Input để nhập password (ít nhất 6 ký tự)
- [ ] Password được hash bằng bcrypt trước khi lưu
- [ ] User phải nhập password đúng mới join được phòng
- [ ] Hiển thị error message nếu password sai
- [ ] Button "Copy" để copy room code + password

**Technical Notes:**
- Service: `RoomSettingsService`
- Hash: bcrypt với 10 salt rounds
- Storage: Redis với TTL 24h
- Validation: Socket event `join-room` check password

---

### US-5.2: Room permissions

**As a** host  
**I want to** kiểm soát quyền của participants  
**So that** tôi manage được ai có thể làm gì

**Acceptance Criteria:**
- [ ] Toggle cho mỗi permission:
  - Allow chat
  - Allow screen share
  - Allow microphone
  - Allow camera
- [ ] Permissions được enforce ở frontend và backend
- [ ] Disable controls nếu user không có permission
- [ ] Default permissions: tất cả đều true

**Technical Notes:**
- DTO: `UpdateSettingsDto`
- Interface: `DetailedRoomSettings.permissions`
- Enforcement: Check permissions trước khi cho phép action

---

### US-5.3: Room settings modal

**As a** host  
**I want to** mở modal để configure room settings  
**So that** tôi có UI thân thiện để manage phòng

**Acceptance Criteria:**
- [ ] Button "Settings" trên room header
- [ ] Modal có 3 tabs:
  - Security: password, permissions
  - Participants: list participants, join settings (join before host)
  - Media: (future - resolution, recording)
- [ ] "Cancel" button để đóng không lưu
- [ ] "Save changes" button để apply settings
- [ ] Modal responsive, đẹp mắt

**Technical Notes:**
- Component: `RoomSettings/RoomSettingsModal`
- Tabs: `SecurityTab`, `MediaTab`, `ParticipantsTab`
- Lazy loaded với `dynamic()` để optimize bundle size

---

### US-5.4: Lock room

**As a** host  
**I want to** khóa phòng để không ai join thêm  
**So that** cuộc họp private chỉ có người đã join

**Acceptance Criteria:**
- [ ] Toggle "Lock Room" trong settings
- [ ] Khi locked, user mới không join được
- [ ] Hiển thị "Room is locked" error
- [ ] Host có thể unlock bất cứ lúc nào

**Technical Notes:**
- Setting: `lockRoom: boolean`
- Check: `RoomSettingsService.isRoomLocked()`

---

## Epic 6: Waiting Room

### US-6.1: Tham gia waiting room

**As a** người dùng  
**I want to** chờ host admit khi phòng có waiting room  
**So that** host kiểm soát được ai vào phòng

**Acceptance Criteria:**
- [ ] Khi join phòng có waiting room enabled, redirect đến waiting page
- [ ] Waiting page hiển thị:
  - "Waiting for host to admit you"
  - Thời gian đã chờ
  - Camera preview (optional)
- [ ] Tự động join phòng khi được admit
- [ ] Hiển thị message nếu bị reject

**Technical Notes:**
- Page: `apps/web/app/room/[roomId]/waiting/page.tsx`
- Socket: `join-waiting-room`, `admitted`, `rejected`
- Service: `WaitingRoomService`

---

### US-6.2: Host admit/reject users

**As a** host  
**I want to** admit hoặc reject người đang chờ  
**So that** tôi kiểm soát ai được vào phòng

**Acceptance Criteria:**
- [ ] Notification popup hiển thị waiting users
- [ ] Mỗi waiting user hiển thị:
  - Display name
  - Thời gian chờ ("2m ago")
  - Buttons: "Admit" và "Reject"
- [ ] Click "Admit" → user được vào phòng
- [ ] Click "Reject" → user nhận message reject
- [ ] Notification tự động ẩn khi không còn waiting users
- [ ] Có thể minimize notification

**Technical Notes:**
- Component: `WaitingUsersNotification`
- Socket events: `admit-user`, `reject-user`, `user-waiting`
- Collapsible với animation

---

### US-6.3: Waiting count indicator

**As a** host  
**I want to** biết có bao nhiêu người đang chờ  
**So that** tôi không bỏ lỡ ai

**Acceptance Criteria:**
- [ ] Badge number trên notification icon
- [ ] Real-time update khi có người join/leave waiting room
- [ ] Sound notification (optional)

---

## Epic 7: Recording

### US-7.1: Start/Stop recording

**As a** host  
**I want to** record cuộc họp  
**So that** tôi có thể xem lại sau

**Acceptance Criteria:**
- [ ] Button "Record" trên control bar
- [ ] Click để start recording
- [ ] Recording indicator hiển thị trên UI (đỏ, có đồng hồ)
- [ ] All participants thấy "Recording in progress"
- [ ] Click lại để stop recording
- [ ] Download file recording sau khi stop

**Technical Notes:**
- Hook: `useMediaRecorder`
- Record: `MediaRecorder` API
- Format: WebM
- Include: video + audio của main speaker

---

### US-7.2: Recording indicator

**As a** người tham gia  
**I want to** biết cuộc họp đang được record  
**So that** tôi ý thức được những gì mình nói

**Acceptance Criteria:**
- [ ] Badge đỏ "REC" với timer ở góc màn hình
- [ ] Duration counter (MM:SS format)
- [ ] Visible cho tất cả participants
- [ ] Không thể tắt bởi non-host

**Technical Notes:**
- Component: `RecordingIndicator`
- Props: `duration`, `formatDuration()`

---

### US-7.3: Pause/Resume recording (Future)

**As a** host  
**I want to** pause recording tạm thời  
**So that** một số phần không được record

**Acceptance Criteria:**
- [ ] Button "Pause" khi đang record
- [ ] Timer dừng lại
- [ ] Resume tiếp tục record
- [ ] Final file merged tất cả segments

---

## Epic 8: Screen Sharing

### US-8.1: Start screen share

**As a** người tham gia  
**I want to** chia sẻ màn hình của mình  
**So that** người khác thấy được những gì tôi muốn trình bày

**Acceptance Criteria:**
- [ ] Button "Share Screen" trên control bar
- [ ] Click hiển thị browser's screen picker
- [ ] Chọn window/tab/entire screen để share
- [ ] Local video tile hiển thị "(Screen)" suffix
- [ ] Remote users thấy screen stream thay vì camera
- [ ] Notify all participants: "X is sharing screen"

**Technical Notes:**
- Hook: `useScreenShare`
- API: `navigator.mediaDevices.getDisplayMedia()`
- Socket events: `screen-share-start`, `screen-share-started`
- Stream switching: replace camera tracks with screen tracks

---

### US-8.2: Stop screen share

**As a** người đang share  
**I want to** dừng chia sẻ màn hình  
**So that** quay lại camera bình thường

**Acceptance Criteria:**
- [ ] Click lại button "Share Screen" để stop
- [ ] Hoặc click "Stop Sharing" trên browser's indicator
- [ ] Tự động switch về camera stream
- [ ] Notify all: "X stopped sharing"
- [ ] Button quay lại trạng thái ban đầu

**Technical Notes:**
- Event listener: `screenStream.getVideoTracks()[0].onended`
- Auto-cleanup khi user click browser's stop button

---

### US-8.3: Screen share với audio (Future)

**As a** người share  
**I want to** share system audio cùng với screen  
**So that** người khác nghe được video/audio tôi đang play

**Acceptance Criteria:**
- [ ] Checkbox "Share audio" trong screen picker
- [ ] Audio stream được mix với microphone audio
- [ ] Remote users nghe được both system audio và mic

---

## Epic 9: Authentication

> ⚠️ **IMPORTANT - Phase hiện tại**: Epic này sẽ được implement ở **Phase sau**. Hiện tại app hoạt động **WITHOUT authentication** - user chỉ cần setup username (xem US-1.0) để sử dụng. Không có:
> - User registration/login
> - JWT tokens
> - Password authentication
> - Session management
> - Meeting history persistence
>
> Username được lưu trong localStorage và không sync với server. Mỗi user là "guest" với display name.

---

### US-9.1: Register account (Future Phase)

**As a** người dùng mới  
**I want to** tạo tài khoản  
**So that** tôi có profile và lưu meeting history

**Acceptance Criteria:**
- [ ] Form register với:
  - Email (required, valid format)
  - Password (min 8 chars, strong)
  - Display name
- [ ] Validation errors hiển thị rõ ràng
- [ ] Success → redirect login hoặc auto-login
- [ ] Email unique check

**Technical Notes:**
- Page: `apps/web/app/register/page.tsx`
- API: `POST /api/auth/register`
- Service: `AuthService`
- Password hash: bcrypt

---

### US-9.2: Login (Future Phase)

**As a** registered user  
**I want to** đăng nhập vào tài khoản  
**So that** access được features cần auth

**Acceptance Criteria:**
- [ ] Form login với email + password
- [ ] JWT token được lưu vào cookie/localStorage
- [ ] Redirect về home page sau login
- [ ] Remember me option
- [ ] Forgot password link

**Technical Notes:**
- Page: `apps/web/app/login/page.tsx`
- API: `POST /api/auth/login`
- JWT Strategy với Passport
- Guard: `JwtAuthGuard`

---

### US-9.3: User profile (Future)

**As a** logged-in user  
**I want to** edit profile của mình  
**So that** update thông tin cá nhân

**Acceptance Criteria:**
- [ ] Avatar upload
- [ ] Display name edit
- [ ] Email (read-only)
- [ ] Timezone settings
- [ ] Theme preference

---

### US-9.4: Meeting history (Future)

**As a** logged-in user  
**I want to** xem lịch sử các cuộc họp đã tham gia  
**So that** tôi có thể join lại hoặc xem thông tin

**Acceptance Criteria:**
- [ ] List các meetings với:
  - Title
  - Date/time
  - Participants count
  - Duration
  - Link to recordings (nếu có)
- [ ] Filter/search meetings
- [ ] Delete meeting from history

---

## Epic 10: UI/UX Enhancements

### US-10.1: Connection status indicator

**As a** người tham gia  
**I want to** biết trạng thái kết nối của mình  
**So that** biết khi nào bị disconnect

**Acceptance Criteria:**
- [ ] Indicator hiển thị:
  - Green: Connected
  - Yellow: Reconnecting
  - Red: Disconnected
- [ ] Toast notification khi connection changes
- [ ] Auto-reconnect với exponential backoff

**Technical Notes:**
- Component: `ConnectionStatus`
- Hook: `useSocket` với `isConnected`, `isReconnecting`

---

### US-10.2: Error handling

**As a** người dùng  
**I want to** thấy error messages rõ ràng  
**So that** tôi biết vấn đề là gì và cách fix

**Acceptance Criteria:**
- [ ] Permission denied → hiển thị instructions
- [ ] Network error → retry button
- [ ] Invalid room code → clear error message
- [ ] Password wrong → "Incorrect password, try again"

**Technical Notes:**
- Component: `PermissionDenied`, `ErrorBoundary`

---

### US-10.3: Keyboard shortcuts

**As a** power user  
**I want to** dùng keyboard shortcuts  
**So that** thao tác nhanh hơn

**Acceptance Criteria:**
- [ ] Space: Mute/unmute (push to talk mode)
- [ ] V: Toggle video
- [ ] C: Toggle chat
- [ ] P: Toggle participants panel
- [ ] S: Start/stop screen share
- [ ] Hiển thị shortcuts help (? key)

---

### US-10.4: Virtual backgrounds (Future)

**As a** người dùng  
**I want to** thay background ảo  
**So that** ẩn background thật của mình

**Acceptance Criteria:**
- [ ] Background blur
- [ ] Chọn ảnh background có sẵn
- [ ] Upload custom background
- [ ] Sử dụng MediaPipe hoặc BodyPix để segment

**Technical Notes:**
- Component: `BackgroundSelector`
- Library: MediaPipe Selfie Segmentation
- Docs: `MEDIAPIPE_SETUP.md`

---

## Epic 11: Performance & Optimization

### US-11.1: Lazy loading components

**As a** developer  
**I want to** lazy load các components không critical  
**So that** initial load nhanh hơn

**Acceptance Criteria:**
- [ ] RoomSettingsModal: lazy loaded
- [ ] BackgroundSelector: lazy loaded
- [ ] Recording features: lazy loaded
- [ ] Code splitting cho routes

**Technical Notes:**
- `next/dynamic` với `ssr: false`

---

### US-11.2: Redis connection pooling

**As a** hệ thống  
**I want to** sử dụng Redis adapter cho Socket.IO  
**So that** scale horizontally với multiple servers

**Acceptance Criteria:**
- [ ] Redis adapter configured
- [ ] Multiple backend instances share state
- [ ] Load balancer distribute connections
- [ ] Sticky sessions not required

**Technical Notes:**
- Adapter: `apps/api/src/adapters/redis-io.adapter.ts`
- Package: `@socket.io/redis-adapter`

---

## Summary

**Total User Stories**: 40+  
**Epics**: 11  
**Status**: 
- ✅ Implemented: ~30 stories
- 🚧 Partial: ~5 stories  
- ⏳ Planned: ~10 stories

**Implementation Progress**: ~75%

---

## Notes

- Các user stories được viết dựa trên codebase hiện tại
- Stories đánh dấu "(Future)" là tính năng đã có plan nhưng chưa implement
- Mỗi story có acceptance criteria cụ thể
- Technical notes giúp developers tìm code nhanh hơn
- Priorities sẽ được thêm trong sprint planning

**Next Steps**:
1. Prioritize stories cho Phase 4
2. Estimate story points
3. Assign to sprints
4. Create tickets in project management tool
