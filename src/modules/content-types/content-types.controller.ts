import { Request, Response, NextFunction } from 'express';
import { contentTypeServices } from './content-types.service';
import { CreateContentTypeSchema, UpdateContentTypeSchema, UpsertEmployeeRecordSchema } from './content-types.validation';
import ApiError from '../../utils/errors/api-error';

// ── Content Type Admin CRUD ─────────────────────────────────────────────────

export const listContentTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const data = await contentTypeServices.listContentTypes(includeInactive);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getContentType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await contentTypeServices.getContentType(req.params.id as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const createContentType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateContentTypeSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);
    const user = (req as any).user;
    const data = await contentTypeServices.createContentType(parsed.data, user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateContentType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateContentTypeSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);
    const data = await contentTypeServices.updateContentType(req.params.id as string, parsed.data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteContentType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await contentTypeServices.deleteContentType(req.params.id as string);
    res.json({ success: true, message: 'Content type deleted' });
  } catch (err) { next(err); }
};

// ── Employee Records ─────────────────────────────────────────────────────────

export const getEmployeeRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestingUser = (req as any).user;
    const targetUserId = (req.params.userId as string) ?? requestingUser.id;

    // Employees can only see their own records
    if (requestingUser.role !== 'ADMIN' && targetUserId !== requestingUser.id) {
      throw ApiError.forbidden('Access denied');
    }

    const data = await contentTypeServices.getEmployeeRecords(targetUserId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const upsertEmployeeRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestingUser = (req as any).user;
    const targetUserId = (req.params.userId as string) ?? requestingUser.id;

    // Employees can only edit their own records
    if (requestingUser.role !== 'ADMIN' && targetUserId !== requestingUser.id) {
      throw ApiError.forbidden('Access denied');
    }

    const parsed = UpsertEmployeeRecordSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);

    const data = await contentTypeServices.upsertEmployeeRecord(
      targetUserId,
      req.params.contentTypeId as string,
      parsed.data,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
