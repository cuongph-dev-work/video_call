export interface User {
    id: string;
    email: string;
    displayName: string;
    avatar?: string;
    createdAt: Date;
}
export interface CreateUserDto {
    email: string;
    password: string;
    displayName: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
}
//# sourceMappingURL=user.d.ts.map