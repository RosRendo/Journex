import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all lessons for the logged-in user
export const getLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || 'default-user'; // using fallback for dev if needed
    const lessons = await prisma.lesson.findMany({
      where: { userId },
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json({ success: true, lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new lesson
export const createLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || 'default-user';
    const { title, concept, notes, images } = req.body;
    let imagesData: any = [];

    if (images) {
      try {
        imagesData = typeof images === 'string' ? JSON.parse(images) : images;
      } catch (e) {
        imagesData = [];
      }
    }

    if (!title) {
      res.status(400).json({ success: false, message: 'Title is required' });
      return;
    }

    const maxLesson = await prisma.lesson.findFirst({
      where: { userId },
      orderBy: { orderIndex: 'desc' }
    });
    const nextOrder = maxLesson ? maxLesson.orderIndex + 1 : 0;

    const newLesson = await prisma.lesson.create({
      data: {
        userId,
        title,
        concept,
        notes,
        images: imagesData,
        orderIndex: nextOrder
      }
    });

    res.json({ success: true, lesson: newLesson });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reorder lessons
export const reorderLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body; // Array of { id: number, orderIndex: number }
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: 'Invalid data format' });
      return;
    }

    const updates = items.map((item: any) => 
      prisma.lesson.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex }
      })
    );

    await prisma.$transaction(updates);

    res.json({ success: true, message: 'Lessons reordered successfully' });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a lesson
export const deleteLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || 'default-user';
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({ where: { id: Number(id) } });
    if (!lesson || lesson.userId !== userId) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    await prisma.lesson.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a lesson
export const updateLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || 'default-user';
    const { id } = req.params;
    const { title, concept, notes, images } = req.body;

    const lesson = await prisma.lesson.findUnique({ where: { id: Number(id) } });
    if (!lesson || lesson.userId !== userId) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    let imagesData = lesson.images;
    if (images !== undefined) {
      try {
        imagesData = typeof images === 'string' ? JSON.parse(images) : images;
      } catch (e) {
        // keep old images if parse fails
      }
    }

    const updated = await prisma.lesson.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(concept !== undefined && { concept }),
        ...(notes !== undefined && { notes }),
        images: imagesData as any
      }
    });

    res.json({ success: true, lesson: updated });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
