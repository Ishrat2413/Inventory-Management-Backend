# Resource Generator CLI

## Overview

The Resource Generator CLI is a command-line tool designed to streamline the creation of resource-related files in a Node.js project. It automatically generates route, model, controller, interface, and validation files based on a specified resource name. This tool helps maintain consistency and speed up development by creating boilerplate code for new resources.

## Features

- **Generate Controller Files**: Create controller files with basic CRUD operations and response handling.
- **Generate Interface Files**: Create TypeScript interface files defining the structure of the resource.
- **Generate Model Files**: Create Mongoose model files with a defined schema.
- **Generate Route Files**: Create route files with standard RESTful endpoints for the specified resource.
- **Generate Service Files**: Create service files include standard RESTful endpoints for managing resources.
- **Generate Validation Files**: Create Zod validation schemas and middleware for request validation.

## Installation

**To use the CLI tool, clone the repository and install the dependencies.**

```bash
git clone <repository-url>
cd <repository-directory>
```

**To install dependencies using npm**:

```bash
npm install
```

**To install dependencies using Yarn**:

```bash
yarn install
```

**To install dependencies using pnpm**:

```bash
pnpm install
```

## Usage

**The CLI tool can be executed using the following command(direct resource)**:

**By using npm**:

```bash
npm run resource <resource-name>
```

**By using yarn**:

```bash
yarn run resource <resource-name>
```

**By using pnpm**:

```bash
pnpm run resource <resource-name>
```

### Command Arguments

- `<resource-name>`: The name of the resource for which you want to generate files. This will be converted to lowercase and used to create file names and paths.

### Example

To generate files for a resource named `blog`, run:

```bash
npm run resource blog
```

This will create the following files:

- **Controller File**: `src/modules/blog/blog.controller.ts`
- **Interface File**: `src/modules/blog/blog.interface.ts`
- **Model File**: `src/modules/blog/blog.model.ts`
- **Route File**: `src/modules/blog/blog.route.ts`
- **Service File**: `src/modules/blog/blog.service.ts`
- **Validation File**: `src/modules/blog/blog.validation.ts`

## File Structure

### Controller File (`blog.controller.ts`)

Contains controller functions for handling HTTP requests, including:

- `createBlog`
- `createManyBlogs`
- `updateBlog`
- `updateManyBlogs`
- `deleteBlog`
- `deleteManyBlogs`
- `getBlogById`
- `getManyBlogs`

### Interface File (`blog.interface.ts`)

Provides TypeScript interfaces for the resource, defining the structure of a resource object.

### Model File (`blog.model.ts`)

Defines a Mongoose schema and model for the resource. Includes:

- Interface for document structure
- Schema definition

### Route File (`blog.route.ts`)

Defines RESTful routes for the resource, including endpoints for creating, updating, deleting, and retrieving resources.

### Service File (`blog.service.ts`)

The `blog.service.ts` file contains service functions for managing blog resources in the application. These functions interact with the `BlogModel` to perform CRUD (Create, Read, Update, Delete) operations on blog data.

### Validation File (`blog.validation.ts`)

Includes Zod validation schemas and middleware functions for validating requests. The validation file ensures that IDs and other required fields are valid.

## Example Files

### Controller File Example

```typescript
import { Request, Response } from 'express';
import { blogServices } from './blog.service';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

/**
 * Controller function to handle the creation of a single Blog.
 *
 * @param {Request} req - The request object containing blog data in the body.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>>} - The created blog.
 * @throws {Error} - Throws an error if the blog creation fails.
 */
export const createBlog = catchAsync(async (req: Request, res: Response) => {
  // Call the service method to create a new blog and get the result
  const result = await blogServices.createBlog(req.body);
  if (!result) throw new Error('Failed to create blog');
  // Send a success response with the created resource data
  ServerResponse(res, true, 201, 'Blog created successfully', result);
});

/**
 * Controller function to handle the creation of multiple blog.
 *
 * @param {Request} req - The request object containing an array of blog data in the body.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>[]>} - The created blog.
 * @throws {Error} - Throws an error if the blog creation fails.
 */
export const createManyBlog = catchAsync(async (req: Request, res: Response) => {
  // Call the service method to create multiple blogs and get the result
  const result = await blogServices.createManyBlog(req.body);
  if (!result) throw new Error('Failed to create multiple blog');
  // Send a success response with the created resources data
  ServerResponse(res, true, 201, 'Blogs created successfully', result);
});

/**
 * Controller function to handle the update operation for a single blog.
 *
 * @param {Request} req - The request object containing the ID of the blog to update in URL parameters and the updated data in the body.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>>} - The updated blog.
 * @throws {Error} - Throws an error if the blog update fails.
 */
export const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Call the service method to update the blog by ID and get the result
  const result = await blogServices.updateBlog(id, req.body);
  if (!result) throw new Error('Failed to update blog');
  // Send a success response with the updated resource data
  ServerResponse(res, true, 200, 'Blog updated successfully', result);
});

/**
 * Controller function to handle the update operation for multiple blog.
 *
 * @param {Request} req - The request object containing an array of blog data in the body.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>[]>} - The updated blog.
 * @throws {Error} - Throws an error if the blog update fails.
 */
export const updateManyBlog = catchAsync(async (req: Request, res: Response) => {
  // Call the service method to update multiple blog and get the result
  const result = await blogServices.updateManyBlog(req.body);
  if (!result.length) throw new Error('Failed to update multiple blog');
  // Send a success response with the updated resources data
  ServerResponse(res, true, 200, 'Blogs updated successfully', result);
});

/**
 * Controller function to handle the deletion of a single blog.
 *
 * @param {Request} req - The request object containing the ID of the blog to delete in URL parameters.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>>} - The deleted blog.
 * @throws {Error} - Throws an error if the blog deletion fails.
 */
export const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Call the service method to delete the blog by ID
  const result = await blogServices.deleteBlog(id);
  if (!result) throw new Error('Failed to delete blog');
  // Send a success response confirming the deletion
  ServerResponse(res, true, 200, 'Blog deleted successfully');
});

/**
 * Controller function to handle the deletion of multiple blog.
 *
 * @param {Request} req - The request object containing an array of IDs of blog to delete in the body.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>[]>} - The deleted blog.
 * @throws {Error} - Throws an error if the blog deletion fails.
 */
export const deleteManyBlog = catchAsync(async (req: Request, res: Response) => {
  // Call the service method to delete multiple blog and get the result
  const result = await blogServices.deleteManyBlog(req.body);
  if (!result) throw new Error('Failed to delete multiple blog');
  // Send a success response confirming the deletions
  ServerResponse(res, true, 200, 'Blogs deleted successfully');
});

/**
 * Controller function to handle the retrieval of a single blog by ID.
 *
 * @param {Request} req - The request object containing the ID of the blog to retrieve in URL parameters.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>>} - The retrieved blog.
 * @throws {Error} - Throws an error if the blog retrieval fails.
 */
export const getBlogById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Call the service method to get the blog by ID and get the result
  const result = await blogServices.getBlogById(id);
  if (!result) throw new Error('blog not found');
  // Send a success response with the retrieved resource data
  ServerResponse(res, true, 200, 'Blog retrieved successfully', result);
});

/**
 * Controller function to handle the retrieval of multiple blog.
 *
 * @param {Request} req - The request object containing query parameters for filtering.
 * @param {Response} res - The response object used to send the response.
 * @returns {Promise<Partial<IBlog>[]>} - The retrieved blog.
 * @throws {Error} - Throws an error if the blog retrieval fails.
 */
export const getManyBlog = catchAsync(async (req: Request, res: Response) => {
  // Type assertion for query parameters
  const query = req.query as unknown as { searchKey?: string; showPerPage: number; pageNo: number };
  // Call the service method to get multiple blog based on query parameters and get the result
  const { blogs, totalData, totalPages } = await blogServices.getManyBlog(query);
  if (!blogs) throw new Error('Failed to retrieve blog');
  // Send a success response with the retrieved resources data
  ServerResponse(res, true, 200, 'Blogs retrieved successfully', { blogs, totalData, totalPages });
});
```

### Interface File Example

```typescript
/**
 * Type definition for Blog.
 *
 * This type defines the structure of a single blog object.
 * @interface TBlog
 */
export interface TBlog {
  // Add fields as needed
}
```

### Model File Example

```typescript
import mongoose, { Document, Schema } from 'mongoose';

// Define and export an interface representing a Blog document
export interface IBlog extends Document {
  // Define the schema fields with their types
  // Example fields (replace with actual fields)
  // fieldName: fieldType;
}

// Define the Blog schema
const BlogSchema: Schema<IBlog> = new Schema(
  {
    // Define schema fields here
    // Example fields (replace with actual schema)
    // fieldName: {
    //   type: Schema.Types.FieldType,
    //   required: true,
    //   trim: true,
    // },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create the Blog model
const Blog = mongoose.model<IBlog>('Blog', BlogSchema);

// Export the Blog model
export default Blog;
```

### Route File Example

```typescript
// Import Router from express
import { Router } from 'express';

// Import controller from corresponding module
import {
  createBlog,
  createManyBlog,
  updateBlog,
  updateManyBlog,
  deleteBlog,
  deleteManyBlog,
  getBlogById,
  getManyBlog,
} from './blog.controller';

//Import validation from corresponding module
import {
  validateCreateBlog,
  validateCreateManyBlog,
  validateUpdateBlog,
  validateUpdateManyBlog,
} from './blog.validation';
import {
  validateId,
  validateIds,
  validateSearchQueries,
} from '../../handlers/common-zod-validator';

// Initialize router
const router = Router();

// Define route handlers
/**
 * @route POST /api/v1/blog/create-blog
 * @description Create a new blog
 * @access Public
 * @param {function} controller - ['createBlog']
 * @param {function} validation - ['validateCreateBlog']
 */
router.post('/create-blog', validateCreateBlog, createBlog);

/**
 * @route POST /api/v1/blog/create-blog/many
 * @description Create multiple blog
 * @access Public
 * @param {function} controller - ['createManyBlog']
 * @param {function} validation - ['validateCreateManyBlog']
 */
router.post('/create-blog/many', validateCreateManyBlog, createManyBlog);

/**
 * @route PATCH /api/v1/blog/update-blog/many
 * @description Update multiple blog information
 * @access Public
 * @param {function} controller - ['updateManyBlog']
 * @param {function} validation - ['validateIds', 'validateUpdateManyBlog']
 */
router.patch('/update-blog/many', validateIds, validateUpdateManyBlog, updateManyBlog);

/**
 * @route PATCH /api/v1/blog/update-blog/:id
 * @description Update blog information
 * @param {string} id - The ID of the blog to update
 * @access Public
 * @param {function} controller - ['updateBlog']
 * @param {function} validation - ['validateId', 'validateUpdateBlog']
 */
router.patch('/update-blog/:id', validateId, validateUpdateBlog, updateBlog);

/**
 * @route DELETE /api/v1/blog/delete-blog/many
 * @description Delete multiple blog
 * @access Public
 * @param {function} controller - ['deleteManyBlog']
 * @param {function} validation - ['validateIds']
 */
router.delete('/delete-blog/many', validateIds, deleteManyBlog);

/**
 * @route DELETE /api/v1/blog/delete-blog/:id
 * @description Delete a blog
 * @param {string} id - The ID of the blog to delete
 * @access Public
 * @param {function} controller - ['deleteBlog']
 * @param {function} validation - ['validateId']
 */
router.delete('/delete-blog/:id', validateId, deleteBlog);

/**
 * @route GET /api/v1/blog/get-blog/many
 * @description Get multiple blog
 * @access Public
 * @param {function} controller - ['getManyBlog']
 * @param {function} validation - ['validateSearchQueries']
 */
router.get('/get-blog/many', validateSearchQueries, getManyBlog);

/**
 * @route GET /api/v1/blog/get-blog/:id
 * @description Get a blog by ID
 * @param {string} id - The ID of the blog to retrieve
 * @access Public
 * @param {function} controller - ['getBlogById']
 * @param {function} validation - ['validateId']
 */
router.get('/get-blog/:id', validateId, getBlogById);

// Export the router
module.exports = router;
```

### Service File Example

```typescript
// Import the model
import BlogModel, { IBlog } from './blog.model';

/**
 * Service function to create a new blog.
 *
 * @param {Partial<IBlog>} data - The data to create a new blog.
 * @returns {Promise<Partial<IBlog>>} - The created blog.
 */
const createBlog = async (data: Partial<IBlog>): Promise<Partial<IBlog>> => {
  const newBlog = new BlogModel(data);
  const savedBlog = await newBlog.save();
  return savedBlog;
};

/**
 * Service function to create multiple blog.
 *
 * @param {Partial<IBlog>[]} data - An array of data to create multiple blog.
 * @returns {Promise<Partial<IBlog>[]>} - The created blog.
 */
const createManyBlog = async (data: Partial<IBlog>[]): Promise<Partial<IBlog>[]> => {
  const createdBlog = await BlogModel.insertMany(data);
  return createdBlog;
};

/**
 * Service function to update a single blog by ID.
 *
 * @param {string} id - The ID of the blog to update.
 * @param {Partial<IBlog>} data - The updated data for the blog.
 * @returns {Promise<Partial<IBlog>>} - The updated blog.
 */
const updateBlog = async (id: string, data: Partial<IBlog>): Promise<Partial<IBlog | null>> => {
  const updatedBlog = await BlogModel.findByIdAndUpdate(id, data, { new: true });
  return updatedBlog;
};

/**
 * Service function to update multiple blog.
 *
 * @param {Array<{ id: string, updates: Partial<IBlog> }>} data - An array of data to update multiple blog.
 * @returns {Promise<Partial<IBlog>[]>} - The updated blog.
 */
const updateManyBlog = async (
  data: Array<{ id: string; updates: Partial<IBlog> }>
): Promise<Partial<IBlog>[]> => {
  const updatePromises = data.map(({ id, updates }) =>
    BlogModel.findByIdAndUpdate(id, updates, { new: true })
  );
  const updatedBlog = await Promise.all(updatePromises);
  // Filter out null values
  const validUpdatedBlog = updatedBlog.filter((item) => item !== null) as IBlog[];
  return validUpdatedBlog;
};

/**
 * Service function to delete a single blog by ID.
 *
 * @param {string} id - The ID of the blog to delete.
 * @returns {Promise<Partial<IBlog>>} - The deleted blog.
 */
const deleteBlog = async (id: string): Promise<Partial<IBlog | null>> => {
  const deletedBlog = await BlogModel.findByIdAndDelete(id);
  return deletedBlog;
};

/**
 * Service function to delete multiple blog.
 *
 * @param {string[]} ids - An array of IDs of blog to delete.
 * @returns {Promise<Partial<IBlog>[]>} - The deleted blog.
 */
const deleteManyBlog = async (ids: string[]): Promise<Partial<IBlog>[]> => {
  const blogToDelete = await BlogModel.find({ _id: { $in: ids } });
  if (!blogToDelete.length) throw new Error('No blog found to delete');
  await BlogModel.deleteMany({ _id: { $in: ids } });
  return blogToDelete;
};

/**
 * Service function to retrieve a single blog by ID.
 *
 * @param {string} id - The ID of the blog to retrieve.
 * @returns {Promise<Partial<IBlog>>} - The retrieved blog.
 */
const getBlogById = async (id: string): Promise<Partial<IBlog | null>> => {
  const blog = await BlogModel.findById(id);
  return blog;
};

/**
 * Service function to retrieve multiple blog based on query parameters.
 *
 * @param {object} query - The query parameters for filtering blog.
 * @returns {Promise<Partial<IBlog>[]>} - The retrieved blog
 */
const getManyBlog = async (query: {
  searchKey?: string;
  showPerPage: number;
  pageNo: number;
}): Promise<{ blogs: Partial<IBlog>[]; totalData: number; totalPages: number }> => {
  const { searchKey = '', showPerPage, pageNo } = query;

  // Build the search filter based on the search key
  const searchFilter = {
    $or: [
      { fieldName: { $regex: searchKey, $options: 'i' } },
      { fieldName: { $regex: searchKey, $options: 'i' } },
      // Add more fields as needed
    ],
  };

  // Calculate the number of items to skip based on the page number
  const skipItems = (pageNo - 1) * showPerPage;

  // Find the total count of matching blog
  const totalData = await BlogModel.countDocuments(searchFilter);

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalData / showPerPage);

  // Find blog based on the search filter with pagination
  const blogs = await BlogModel.find(searchFilter).skip(skipItems).limit(showPerPage).select(''); // Keep/Exclude any field if needed

  return { blogs, totalData, totalPages };
};

export const blogServices = {
  createBlog,
  createManyBlog,
  updateBlog,
  updateManyBlog,
  deleteBlog,
  deleteManyBlog,
  getBlogById,
  getManyBlog,
};
```

### Validation File Example

```typescript
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import zodErrorHandler from '../../handlers/zod-error-handler';

/**
 * Zod schema for validating blog data during creation.
 */
const zodCreateBlogSchema = z
  .object({
    // Define fields required for creating a new blog.
    // Example:
    // filedName: z.string({ message: 'Please provide a filedName.' }).min(1, "Can't be empty."),
  })
  .strict();

/**
 * Middleware function to validate blog creation data using Zod schema.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export const validateCreateBlog = (req: Request, res: Response, next: NextFunction) => {
  // Validate the request body for creating a new blog
  const parseResult = zodCreateBlogSchema.safeParse(req.body);

  // If validation fails, send an error response using the Zod error handler
  if (!parseResult.success) {
    return zodErrorHandler(req, res, parseResult.error);
  }

  // If validation passes, proceed to the next middleware function
  return next();
};

/**
 * Zod schema for validating multiple blog data during creation.
 */
const zodCreateManyBlogSchema = z.array(zodCreateBlogSchema);

/**
 * Middleware function to validate multiple blog creation data using Zod schema.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export const validateCreateManyBlog = (req: Request, res: Response, next: NextFunction) => {
  const parseResult = zodCreateManyBlogSchema.safeParse(req.body);
  if (!parseResult.success) {
    return zodErrorHandler(req, res, parseResult.error);
  }
  return next();
};

/**
 * Zod schema for validating blog data during updates.
 */
const zodUpdateBlogSchema = z
  .object({
    // Define fields required for updating an existing blog.
    // Example:
    // fieldName: z.string({ message: 'Please provide a filedName.' }).optional(), // Fields can be optional during updates
  })
  .strict();

/**
 * Middleware function to validate blog update data using Zod schema.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export const validateUpdateBlog = (req: Request, res: Response, next: NextFunction) => {
  // Validate the request body for updating an existing blog
  const parseResult = zodUpdateBlogSchema.safeParse(req.body);

  // If validation fails, send an error response using the Zod error handler
  if (!parseResult.success) {
    return zodErrorHandler(req, res, parseResult.error);
  }

  // If validation passes, proceed to the next middleware function
  return next();
};

/**
 * Zod schema for validating multiple blog data during updates.
 */
const zodUpdateManyBlogSchema = z.array(zodUpdateBlogSchema);

/**
 * Middleware function to validate multiple blog update data using Zod schema.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export const validateUpdateManyBlog = (req: Request, res: Response, next: NextFunction) => {
  const parseResult = zodUpdateManyBlogSchema.safeParse(req.body);
  if (!parseResult.success) {
    return zodErrorHandler(req, res, parseResult.error);
  }
  return next();
};
```

---

## Contact

For any questions or feedback, please contact [JoySarkar] at [developer.joysarkar@gmail.com].

Feel free to adjust any sections to better fit your project's specifics or personal preferences!
