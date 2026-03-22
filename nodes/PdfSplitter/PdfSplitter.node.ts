// nodes/PdfSplitter/PdfSplitter.node.ts
import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ApplicationError,
} from 'n8n-workflow';
import { PDFDocument } from 'pdf-lib';

export class PdfSplitter implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Split PDF',
        name: 'pdfSplitter',
        icon: 'file:logo-pdf-split.svg',
        group: ['transform'],
        version: 1,
        description: 'Split a PDF binary into multiple parts based on page count',
        usableAsTool: true,
        defaults: { name: 'Split PDF' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Pages Per Part',
                name: 'pagesPerPart',
                type: 'number',
                default: 10,
                typeOptions: { minValue: 1 },
                description: 'Number of pages in each split part',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                description: 'Name of the binary property containing the PDF',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Check if binary data exists
            if (!item.binary) {
                throw new ApplicationError('No binary data found on input item');
            }

            const binaryKey = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
            const pagesPerPart = this.getNodeParameter('pagesPerPart', i, 10) as number;

            if (!item.binary[binaryKey]) {
                throw new ApplicationError(`Binary property '${binaryKey}' not found`);
            }

            const pdfBuffer = await this.helpers.getBinaryDataBuffer(i, binaryKey);
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const totalPages = pdfDoc.getPageCount();
            const totalParts = Math.ceil(totalPages / pagesPerPart);

            for (let partIndex = 0; partIndex < totalParts; partIndex++) {
                const newPdf = await PDFDocument.create();
                const start = partIndex * pagesPerPart;
                const end = Math.min(start + pagesPerPart, totalPages);
                const pageIndices = Array.from({ length: end - start }, (_, k) => start + k);
                const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach((p) => newPdf.addPage(p));
                const partBytes = await newPdf.save();

                returnData.push({
                    json: {
                        partNumber: partIndex + 1,
                        totalPages,
                        pagesInPart: copiedPages.length,
                    },
                    binary: {
                        data: {
                            data: Buffer.from(partBytes).toString('base64'),
                            mimeType: 'application/pdf',
                            fileName: `part_${partIndex + 1}.pdf`,
                        },
                    },
                    pairedItem: { item: i },
                });
            }
        }

        return [returnData];
    }
}