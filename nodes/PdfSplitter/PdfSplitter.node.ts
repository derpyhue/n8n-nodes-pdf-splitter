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
        description: 'Split a PDF by page count or custom user-provided splits',
        usableAsTool: true,
        defaults: { name: 'Split PDF' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Pages Per Part (Hard Limit)',
                name: 'pagesPerPart',
                type: 'number',
                default: 10,
                typeOptions: { minValue: 1 },
                description: 'Maximum number of pages per split part if custom split is disabled',
            },
            {
                displayName: 'Enable Custom Split',
                name: 'enableCustomSplit',
                type: 'boolean',
                default: false,
                description: 'Enable to use user-provided splits instead of just the hard limit',
            },
            {
                displayName: 'Use User-Provided Splits (JSON)',
                name: 'userSplits',
                type: 'string',
                default: '',
                description: 'Optional JSON array of page ranges [[0,4],[5,9]] to define split points',
                displayOptions: {
                    show: {
                        enableCustomSplit: [true],
                    },
                },
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

            if (!item.binary) {
                throw new ApplicationError('No binary data found on input item');
            }

            const binaryKey = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
            const maxPages = this.getNodeParameter('pagesPerPart', i, 10) as number;
            const enableCustomSplit = this.getNodeParameter('enableCustomSplit', i, false) as boolean;
            const userSplitsRaw = enableCustomSplit ? this.getNodeParameter('userSplits', i, '') as string : '';

            if (!item.binary[binaryKey]) {
                throw new ApplicationError(`Binary property '${binaryKey}' not found`);
            }

            const pdfBuffer = await this.helpers.getBinaryDataBuffer(i, binaryKey);
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const totalPages = pdfDoc.getPageCount();

            let splits: [number, number][] = [];

            // Custom splits enabled & user JSON provided
            if (enableCustomSplit && userSplitsRaw) {
                try {
                    const parsed = JSON.parse(userSplitsRaw) as [number, number][];
                    splits = parsed.map(([start, end]) => {
                        const adjustedSplits: [number, number][] = [];
                        let currentStart = start;
                        while (currentStart <= end) {
                            const currentEnd = Math.min(currentStart + maxPages - 1, end);
                            adjustedSplits.push([currentStart, currentEnd]);
                            currentStart = currentEnd + 1;
                        }
                        return adjustedSplits;
                    }).flat();
                } catch (e) {
                    throw new ApplicationError('Invalid JSON for user-provided splits');
                }
            } else {
                // Default: split by hard limit
                const totalParts = Math.ceil(totalPages / maxPages);
                for (let partIndex = 0; partIndex < totalParts; partIndex++) {
                    const start = partIndex * maxPages;
                    const end = Math.min(start + maxPages, totalPages) - 1;
                    splits.push([start, end]);
                }
            }

            // Generate split PDFs
            for (let partIndex = 0; partIndex < splits.length; partIndex++) {
                const [start, end] = splits[partIndex];
                const pageIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach(p => newPdf.addPage(p));

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