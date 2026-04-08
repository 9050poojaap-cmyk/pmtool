import PDFDocument from 'pdfkit';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';

export async function projectPdfReport(req, res, next) {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const tasks = await Task.find({ projectId }).lean();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Done').length;
    const pending = tasks.filter((t) => t.status !== 'Done').length;
    const productivity = total ? Math.round((completed / total) * 100) : 0;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="report-${projectId}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text('Project report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${project.title}`);
    doc.text(`Description: ${project.description || '—'}`);
    doc.moveDown();
    doc.text(`Total tasks: ${total}`);
    doc.text(`Completed: ${completed}`);
    doc.text(`Pending / active: ${pending}`);
    doc.text(`Productivity: ${productivity}%`);
    doc.moveDown();
    doc.fontSize(14).text('Task summary');
    doc.moveDown(0.5);
    doc.fontSize(10);
    tasks.slice(0, 80).forEach((t) => {
      doc.text(`• [${t.status}] ${t.title} — ${t.priority}${t.dueDate ? ` — due ${new Date(t.dueDate).toLocaleDateString()}` : ''}`);
    });
    if (tasks.length > 80) {
      doc.moveDown();
      doc.text(`… and ${tasks.length - 80} more tasks`);
    }
    doc.end();
  } catch (e) {
    next(e);
  }
}
