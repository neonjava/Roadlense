# RoadFix

Road damage reporting app with map locations, severity analysis, and citizen and staff dashboards.

![Project workflow](docs/workflow.svg)

## Workflow

1. Citizen submits damage report.
2. Backend stores location and media.
3. Optional AI assesses severity.
4. Staff reviews and prioritizes repair.

## Demo visuals

These images use generated road damage and sample report data. The analysis values are illustrative; live AI analysis requires a configured provider.

- [Admin dashboard](docs/demo/dashboard.png)
- [Photo upload](docs/demo/upload-preview.png)
- [Report with sample analysis](docs/demo/analysis-demo.png)
- [Sample pothole photo](docs/demo/pothole-sample.png)

## Getting started

Configure `backend/.env` from `backend/.env.example`, install backend requirements, and run the FastAPI server. Install frontend packages and start the React app separately.

## License

Licensed under [AGPL-3.0](LICENSE).
