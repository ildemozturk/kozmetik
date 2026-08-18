export interface UserRegisterDto {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserLoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  fullName: string;
  email: string;
  role: string;
}