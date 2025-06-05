import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { scenes, contentBlocks, projects } from "../../db/schema";
import { eq, asc } from "drizzle-orm";
import PDFDocument from "pdfkit";
import path from "path";

function getVisibleBlocks(sceneId: string) {
  return db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.sceneId, sceneId))
    .orderBy(asc(contentBlocks.position))
    .all()
    .filter((b) => b.hidden === 0);
}

function getFontPath(filename: string): string {
  // pdfmake ships Roboto TTF files we can use
  return path.join(
    __dirname,
    "..",
    "..",
    "..",
    "node_modules",
    "pdfmake",
    "fonts",
    "Roboto",
    filename
  );
}

export async function exportRoutes(app: FastifyInstance) {
  app.post("/api/export/pdf", async (request, reply) => {
    const body = request.body as {
      targetId: string;
      scope: "scene" | "project";
      characterHeaders: boolean;
      pdfStyle: "prose" | "screenplay";
    };

    const { targetId, scope, characterHeaders, pdfStyle } = body;

    // Gather scenes and blocks
    let projectTitle = "Export";
    const sceneData: Array<{
      title: string;
      blocks: Array<{ speaker: string; text: string; bookmarkLabel: string }>;
    }> = [];

    if (scope === "project") {
      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, targetId))
        .get();
      if (project) projectTitle = project.title ?? "Export";

      const sceneRows = db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, targetId))
        .orderBy(asc(scenes.position))
        .all();

      for (const scene of sceneRows) {
        const blocks = getVisibleBlocks(scene.id);
        sceneData.push({
          title: scene.title,
          blocks: blocks.map((b) => ({
            speaker: b.speaker ?? "",
            text: b.text ?? "",
            bookmarkLabel: b.bookmarkLabel ?? "",
          })),
        });
      }
    } else {
      const scene = db
        .select()
        .from(scenes)
        .where(eq(scenes.id, targetId))
        .get();
      if (scene) {
        const project = db
          .select()
          .from(projects)
          .where(eq(projects.id, scene.projectId))
          .get();
        projectTitle = project?.title ?? scene.title;

        const blocks = getVisibleBlocks(scene.id);
        sceneData.push({
          title: scene.title,
          blocks: blocks.map((b) => ({
            speaker: b.speaker ?? "",
            text: b.text ?? "",
            bookmarkLabel: b.bookmarkLabel ?? "",
          })),
        });
      }
    }

    // Create PDF with PDFKit
    const robotoRegular = getFontPath("Roboto-Regular.ttf");
    const robotoBold = getFontPath("Roboto-Medium.ttf");
    const robotoItalic = getFontPath("Roboto-Italic.ttf");

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
      info: { Title: projectTitle },
    });

    // Register fonts
    doc.registerFont("Roboto", robotoRegular);
    doc.registerFont("Roboto-Bold", robotoBold);
    doc.registerFont("Roboto-Italic", robotoItalic);

    // Title page
    doc.font("Roboto-Bold").fontSize(28);
    doc.moveDown(8);
    doc.text(projectTitle, { align: "center" });

    if (sceneData.length > 0) {
      doc.font("Roboto").fontSize(12).fillColor("#888888");
      doc.moveDown(0.5);
      doc.text(
        `${sceneData.length} scene${sceneData.length !== 1 ? "s" : ""}`,
        { align: "center" }
      );
    }

    doc.fillColor("#000000");

    // TOC if 5+ scenes
    if (sceneData.length >= 5) {
      doc.addPage();
      doc.font("Roboto-Bold").fontSize(18);
      doc.text("Table of Contents");
      doc.moveDown(1);

      doc.font("Roboto").fontSize(11);
      for (let i = 0; i < sceneData.length; i++) {
        doc.text(`${i + 1}. ${sceneData[i].title}`);
        doc.moveDown(0.3);
      }
    }

    // Scene content
    for (let si = 0; si < sceneData.length; si++) {
      const scene = sceneData[si];

      doc.addPage();

      // Scene heading
      doc.font("Roboto-Bold").fontSize(18);
      doc.text(scene.title);
      doc.moveDown(1);

      for (const block of scene.blocks) {
        // Character header
        if (characterHeaders && block.speaker) {
          doc.moveDown(0.5);
          if (pdfStyle === "screenplay") {
            doc.font("Roboto-Bold").fontSize(10);
            doc.text(block.speaker.toUpperCase(), { align: "center" });
          } else {
            doc.font("Roboto-Bold").fontSize(10);
            doc.text(block.speaker);
          }
          doc.moveDown(0.3);
        }

        // Block text - parse italics
        const text = block.text ?? "";
        const parts = text.split(/(\*[^*]+\*)/);

        if (pdfStyle === "screenplay") {
          const indent = 60;
          const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent * 2;

          for (const part of parts) {
            if (part.startsWith("*") && part.endsWith("*")) {
              doc.font("Roboto-Italic").fontSize(12);
              doc.text(part.slice(1, -1), doc.page.margins.left + indent, undefined, {
                width,
                continued: true,
              });
            } else if (part) {
              doc.font("Roboto").fontSize(12);
              doc.text(part, doc.page.margins.left + indent, undefined, {
                width,
                continued: true,
              });
            }
          }
          doc.text("", { continued: false }); // flush
        } else {
          for (const part of parts) {
            if (part.startsWith("*") && part.endsWith("*")) {
              doc.font("Roboto-Italic").fontSize(11);
              doc.text(part.slice(1, -1), { align: "justify", lineGap: 4, continued: true });
            } else if (part) {
              doc.font("Roboto").fontSize(11);
              doc.text(part, { align: "justify", lineGap: 4, continued: true });
            }
          }
          doc.text("", { continued: false }); // flush
        }

        doc.moveDown(0.5);
      }
    }

    // Add page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.font("Roboto").fontSize(8).fillColor("#999999");
      doc.text(
        `${i + 1} / ${pages.count}`,
        0,
        doc.page.height - 50,
        { align: "center" }
      );
    }

    // Collect output
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const result = Buffer.concat(chunks);
        reply.type("application/pdf").send(result);
        resolve(reply);
      });
      doc.on("error", reject);
      doc.end();
    });
  });
}
