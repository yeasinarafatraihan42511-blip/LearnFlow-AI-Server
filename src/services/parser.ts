import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const parseDocument = async (
  buffer: Buffer,
  mimeType: string,
): Promise<string> => {
  switch (mimeType) {
    case 'text/plain':
      return buffer.toString('utf-8');

    case 'application/pdf': {
      const data = await pdfParse(buffer);
      return data.text;
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const data = await mammoth.extractRawText({ buffer });
      return data.value;
    }

    default:
      throw new Error(`Unsupported mime type for parsing: ${mimeType}`);
  }
};
