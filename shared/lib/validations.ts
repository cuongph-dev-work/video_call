import * as v from 'valibot';

/**
 * Username validation schema
 * Rules: 2-30 characters, letters (including Vietnamese), numbers and spaces only
 */
export const usernameSchema = v.object({
  username: v.pipe(
    v.string('Tên phải là chuỗi ký tự'),
    v.trim(),
    v.minLength(2, 'Tên phải có ít nhất 2 ký tự'),
    v.maxLength(30, 'Tên không được quá 30 ký tự'),
    v.regex(/^[\p{L}\p{N}\s]+$/u, 'Tên chỉ được chứa chữ cái, số và khoảng trắng'),
    v.nonEmpty('Tên không được để trống')
  ),
});

/**
 * Room code validation schema
 * Format: XX-XXXX-XX (8 uppercase letters)
 */
export const roomCodeSchema = v.object({
  roomCode: v.pipe(
    v.string('Mã phòng phải là chuỗi ký tự'),
    v.transform((input) => input.replace(/[\s-]/g, '').toUpperCase()), // Clean and uppercase
    v.regex(/^[A-Z]{8}$/, 'Mã phòng không hợp lệ. Vui lòng nhập 8 chữ cái'),
    v.transform((cleaned) => {
      // Format: XX-XXXX-XX
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6, 8)}`;
    })
  ),
});

/**
 * Display name schema (for pre-join page)
 * Same rules as username - supports Vietnamese characters
 */
export const displayNameSchema = v.object({
  displayName: v.pipe(
    v.string('Tên hiển thị phải là chuỗi ký tự'),
    v.trim(),
    v.minLength(2, 'Tên hiển thị phải có ít nhất 2 ký tự'),
    v.maxLength(30, 'Tên hiển thị không được quá 30 ký tự'),
    v.regex(/^[\p{L}\p{N}\s]+$/u, 'Tên hiển thị chỉ được chứa chữ cái, số và khoảng trắng'),
    v.nonEmpty('Tên hiển thị không được để trống')
  ),
});

// Type exports
export type UsernameFormData = v.InferOutput<typeof usernameSchema>;
export type RoomCodeFormData = v.InferOutput<typeof roomCodeSchema>;
export type DisplayNameFormData = v.InferOutput<typeof displayNameSchema>;
