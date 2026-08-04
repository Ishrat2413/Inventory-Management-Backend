import { Request, Response } from 'express';
import { attendanceServices } from './attendance.service';
import { AttendanceSearchQueryInput } from './attendance.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const checkIn = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await attendanceServices.checkIn(req.user!.id, req.body);
  ServerResponse(res, true, 201, 'Checked in successfully', result);
});

export const checkOut = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await attendanceServices.checkOut(req.user!.id, req.body);
  ServerResponse(res, true, 200, 'Checked out successfully', result);
});

export const getManyAttendance = catchAsync(async (req: AuthedRequest, res: Response) => {
  const query = req.query as unknown as AttendanceSearchQueryInput;
  const { records, totalData, totalPages } = await attendanceServices.getManyAttendance(query, req.user!);
  ServerResponse(res, true, 200, 'Attendance records retrieved successfully', { records, totalData, totalPages });
});

export const getMyTodayStatus = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await attendanceServices.getMyTodayStatus(req.user!.id);
  ServerResponse(res, true, 200, "Today's status retrieved successfully", result);
});

export const overrideAttendance = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await attendanceServices.overrideAttendance(req.body, req.user!.id);
  ServerResponse(res, true, 200, 'Attendance override saved successfully', result);
});

export const updateAttendance = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await attendanceServices.updateAttendance(req.params.id as string, req.body, req.user!.id);
  ServerResponse(res, true, 200, 'Attendance record updated successfully', result);
});
