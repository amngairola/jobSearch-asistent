const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

/**
 * Coordinate-aware PDF text extractor using pdfreader.
 * Reconstructs lines based on vertical proximity and horizontal order,
 * preserving paragraphs, headings, bullet points, and multi-column text.
 */
function extractPdfText(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const { PdfReader } = require('pdfreader');
      const items = [];

      new PdfReader().parseFileItems(filePath, (err, item) => {
        if (err) {
          return tryFallbackPdfParse(filePath).then(resolve).catch(reject);
        }

        if (!item) {
          // EOF: process collected items
          if (items.length === 0) {
            return tryFallbackPdfParse(filePath).then(resolve).catch(reject);
          }

          // Sort items by page, then vertical position (y), then horizontal position (x)
          items.sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            // Within ~0.25 vertical units, treat as the same line
            if (Math.abs(a.y - b.y) > 0.25) return a.y - b.y;
            return a.x - b.x;
          });

          let result = '';
          let lastY = null;
          let lastPage = null;

          for (const it of items) {
            if (lastPage !== null && it.page !== lastPage) {
              result += '\n\n';
              lastY = null;
            }

            if (lastY === null) {
              result += it.text;
            } else {
              const diffY = it.y - lastY;
              if (diffY > 1.2) {
                // Section / paragraph break
                result += '\n\n' + it.text;
              } else if (diffY > 0.25) {
                // New line
                result += '\n' + it.text;
              } else {
                // Same line, separate with space
                result += ' ' + it.text;
              }
            }
            lastY = it.y;
            lastPage = it.page;
          }

          const cleaned = result.trim();
          if (cleaned.length > 20) {
            resolve(cleaned);
          } else {
            tryFallbackPdfParse(filePath).then(resolve).catch(reject);
          }
        } else if (item.text) {
          items.push({
            text: item.text.trim(),
            x: item.x,
            y: item.y,
            page: item.page || 1
          });
        }
      });
    } catch (e) {
      tryFallbackPdfParse(filePath).then(resolve).catch(reject);
    }
  });
}

function tryFallbackPdfParse(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const pdfParse = require('pdf-parse');
      const data = fs.readFileSync(filePath);
      pdfParse(data)
        .then(pdfData => resolve(pdfData.text ? pdfData.text.trim() : ''))
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * ResumeParserAgent: extracts structured raw text from PDF or DOCX files.
 */
class ResumeParserAgent {
  async extractText(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Resume file not found at ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    let rawText = '';

    if (ext === '.pdf') {
      rawText = await extractPdfText(filePath);
    } else if (ext === '.docx') {
      // First attempt markdown conversion to preserve bullet lists & bold headings
      try {
        const mdResult = await mammoth.convertToMarkdown({ path: filePath });
        if (mdResult && mdResult.value && mdResult.value.trim().length > 30) {
          rawText = mdResult.value.trim();
        }
      } catch (_) {}

      // Fallback to extractRawText if markdown conversion was insufficient
      if (!rawText) {
        const result = await mammoth.extractRawText({ path: filePath });
        if (result && result.value && result.value.trim().length > 0) {
          rawText = result.value.trim();
        }
      }
    } else {
      throw new Error(`Unsupported file type: ${ext}. Only PDF and DOCX files are allowed.`);
    }

    if (!rawText || rawText.trim().length < 20) {
      throw new Error(`Extracted text is empty or too short (${rawText.length} chars). Ensure the file is not corrupted or image-only.`);
    }

    // Diagnostics logging without leaking PII
    const lineCount = rawText.split('\n').filter(l => l.trim().length > 0).length;
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    console.log(`[ResumeParser] Successfully extracted: ${rawText.length} characters, ~${wordCount} words, ${lineCount} text blocks (${ext.toUpperCase()})`);

    return rawText;
  }

  async parseResume(filePath) {
    const rawText = await this.extractText(filePath);
    return { rawText };
  }
}

module.exports = ResumeParserAgent;
