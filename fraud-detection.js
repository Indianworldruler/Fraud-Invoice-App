// fraud-detection.js
class InvoiceFraudDetection {
    constructor() {
        this.fraudPatterns = {
            phishing: /^(?=.*invoice)(?=.*urgent)(?=.*payment).*$/i,
            overcharging: null,
            duplicate: new Map(),
            altered: null,
            kickback: /^(?=.*referral)(?=.*commission).*$/i,
            phantom: new Map(),
            shellCompany: new Set(['known_shell_company1', 'known_shell_company2']),
            payroll: null,
            crossCompany: new Map(),
            advancePayment: /^(?=.*advance)(?=.*payment)(?=.*required).*$/i
        };
        
        this.results = [];
        this.initializeCharts();
    }

    async processFile(file) {
        const content = await this.extractFileContent(file);
        const fraudChecks = [
            this.checkPhishingScam,
            this.checkOvercharging,
            this.checkDuplicate,
            this.checkAltered,
            this.checkKickback,
            this.checkPhantomVendor,
            this.checkShellCompany,
            this.checkPayrollFraud,
            this.checkCrossCompanyFraud,
            this.checkAdvancePaymentScam
        ];

        const results = await Promise.all(fraudChecks.map(check => check.call(this, content)));
        return results.filter(result => result !== null);
    }

    async extractFileContent(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch(extension) {
            case 'pdf':
                return await this.extractPDFContent(file);
            case 'xlsx':
            case 'xls':
                return await this.extractExcelContent(file);
            case 'doc':
            case 'docx':
                return await this.extractWordContent(file);
            default:
                throw new Error('Unsupported file format');
        }
    }

    async extractPDFContent(file) {
        // PDF extraction logic using pdf.js
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let text = '';
        
        for(let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
        }
        
        return text;
    }

    async extractExcelContent(file) {
        // Excel extraction logic using XLSX
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        
        return workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(worksheet, {header: 1});
        }).flat();
    }

    async extractWordContent(file) {
        // Word document extraction logic using mammoth
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
        return result.value;
    }

    // Fraud detection algorithms
    checkPhishingScam(content) {
        if (this.fraudPatterns.phishing.test(content)) {
            return {
                type: 'Phishing Scam',
                risk: 'high',
                details: 'Suspicious urgency and payment-related language detected'
            };
        }
        return null;
    }

    checkOvercharging(content) {
        // Complex algorithm to detect price inflation
        const prices = this.extractPrices(content);
        const marketPrices = this.getMarketPrices(); // External API call
        
        const inflatedItems = prices.filter(price => 
            price > marketPrices[price.item] * 1.5
        );

        if (inflatedItems.length > 0) {
                type: 'Overcharging',
                risk: 'high',
                details: `${inflatedItems.length} items found with inflated prices`
            };
        }
        return null;
    }

    checkDuplicate(content) {
        const hash = this.calculateHash(content);
        if (this.fraudPatterns.duplicate.has(hash)) {
            return {
                type: 'Duplicate Invoice',
                risk: 'high',
                details: 'Exact match found with existing invoice'
            };
        }
        this.fraudPatterns.duplicate.set(hash, content);
        return null;
    }

    // Helper functions for visualization
    initializeCharts() {
        const fraudTypeCtx = document.getElementById('fraudTypeChart').getContext('2d');
        const riskLevelCtx = document.getElementById('riskLevelChart').getContext('2d');

        this.fraudTypeChart = new Chart(fraudTypeCtx, {
            type: 'bar',
            data: {
                labels: ['Phishing', 'Overcharging', 'Duplicate', 'Altered', 'Kickback'],
                datasets: [{
                    label: 'Fraud Types Detected',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                }]
            }
        });

        this.riskLevelChart = new Chart(riskLevelCtx, {
            type: 'pie',
            data: {
                labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#ff6384', '#ff9f40', '#4bc0c0']
                }]
            }
        });
    }

    updateCharts(results) {
        // Update chart data based on detection results
        const fraudTypeCounts = this.calculateFraudTypeCounts(results);
        const riskLevelCounts = this.calculateRiskLevelCounts(results);

        this.fraudTypeChart.data.datasets[0].data = fraudTypeCounts;
        this.fraudTypeChart.update();

        this.riskLevelChart.data.datasets[0].data = riskLevelCounts;
        this.riskLevelChart.update();
    }
}

// Initialize the application
const fraudDetection = new InvoiceFraudDetection();

async function processFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    for (let file of files) {
        try {
            const results = await fraudDetection.processFile(file);
            displayResults(results, file.name);
            fraudDetection.updateCharts(results);
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            resultsList.innerHTML += `<div class="fraud-alert high-risk">
                Error processing ${file.name}: ${error.message}
            </div>`;
        }
    }
}

function displayResults(results, fileName) {
    const resultsList = document.getElementById('resultsList');
    
    results.forEach(result => {
        const alertClass = `fraud-alert ${result.risk}-risk`;
        resultsList.innerHTML += `
            <div class="${alertClass}">
                <h3>${fileName}</h3>
                <p><strong>Type:</strong> ${result.type}</p>
                <p><strong>Risk Level:</strong> ${result.risk}</p>
                <p><strong>Details:</strong> ${result.details}</p>
            </div>
        `;
    });
}

function exportToExcel() {
    // Implementation for Excel export
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(fraudDetection.results);
    XLSX.utils.book_append_sheet(wb, ws, "Fraud Detection Results");
    XLSX.writeFile(wb, "fraud_detection_results.xlsx");
}

function exportToWord() {
    // Implementation for Word export
    const content = fraudDetection.results.map(result => 
        `Type: ${result.type}\nRisk: ${result.risk}\nDetails: ${result.details}\n\n`
    ).join('');
    
    const blob = new Blob([content], {type: 'application/msword'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fraud_detection_results.doc';
    link.click();
}
