#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function convertHtmlToPdf() {
  const htmlFile = path.join(__dirname, '../planos-tabelas.html');
  const pdfFile = path.join(__dirname, '../planos-tabelas.pdf');

  if (!fs.existsSync(htmlFile)) {
    console.error(`❌ Arquivo não encontrado: ${htmlFile}`);
    process.exit(1);
  }

  try {
    console.log('🚀 Iniciando conversão HTML → PDF...');

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Carregar arquivo HTML
    const htmlContent = fs.readFileSync(htmlFile, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Gerar PDF otimizado para impressão
    await page.pdf({
      path: pdfFile,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    const fileSizeKB = (fs.statSync(pdfFile).size / 1024).toFixed(2);
    console.log(`✅ PDF criado com sucesso!`);
    console.log(`📄 Arquivo: ${pdfFile}`);
    console.log(`📊 Tamanho: ${fileSizeKB} KB`);

  } catch (error) {
    console.error('❌ Erro na conversão:', error.message);
    process.exit(1);
  }
}

convertHtmlToPdf();
