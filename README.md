# n8n-nodes-pdf-splitter

Split PDF files into multiple parts by page count for n8n workflows.

## Description

This node allows you to split a PDF binary into multiple parts based on a specified page count. Each part is returned as a separate binary item, making it easy to process large PDFs in chunks.

## Installation

npm install n8n-nodes-pdf-splitter

## Features

- Split PDFs by page count
- Multiple output items (one per part)
- Metadata included (part number, total pages, pages in part)
- Binary data handling
- Error handling for missing files

## Usage

1. Add the Split PDF node to your workflow
2. Connect it to a node that provides a PDF binary (e.g., Read Binary File, HTTP Request)
3. Set Pages Per Part (e.g., 10)
4. Set Binary Property (default: data)
5. Execute the workflow

## Example Workflow

[Read Binary File] → [Split PDF] → [Process Each Part]

## Configuration

Parameter          Type     Default   Description
Pages Per Part     Number   10        Number of pages in each split part
Binary Property    String   data      Name of the binary property containing the PDF

## Output

Each output item contains:

JSON Data:
- partNumber: The part number (1, 2, 3, ...)
- totalPages: Total pages in the original PDF
- pagesInPart: Number of pages in this specific part

Binary Data:
- data: The split PDF file
- mimeType: application/pdf
- fileName: part_X.pdf

## Example

If you have a 30-page PDF and set Pages Per Part to 10, you will get 3 output items:

Item 1: Pages 1-10, partNumber: 1, totalPages: 30, pagesInPart: 10
Item 2: Pages 11-20, partNumber: 2, totalPages: 30, pagesInPart: 10
Item 3: Pages 21-30, partNumber: 3, totalPages: 30, pagesInPart: 10

## Requirements

- n8n

## Dependencies

- pdf-lib (PDF manipulation library)

## License

MIT License

## Author

Website: https://tiborbosma.nl

## Support

If you encounter any issues or have suggestions, please open an issue on the GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Keywords

n8n, pdf, split, binary, document, community-node
