package com.lodhidevelop.taleemiduniya_pro.core.utils

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Environment
import android.widget.Toast
import com.lodhidevelop.taleemiduniya_pro.data.repository.SchoolStats
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

object ReportGenerator {

    fun generateSchoolReport(context: Context, stats: SchoolStats) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 Size
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas
        val paint = Paint()

        // Header
        paint.color = Color.BLACK
        paint.textSize = 24f
        paint.isFakeBoldText = true
        canvas.drawText("Taleemi Dunya - School Report", 50f, 50f, paint)

        paint.textSize = 12f
        paint.isFakeBoldText = false
        val date = SimpleDateFormat("dd-MMM-yyyy", Locale.getDefault()).format(Date())
        canvas.drawText("Generated on: $date", 50f, 75f, paint)

        // Divider
        canvas.drawLine(50f, 90f, 545f, 90f, paint)

        // Stats Section
        paint.textSize = 16f
        paint.isFakeBoldText = true
        canvas.drawText("Institutional Overview", 50f, 130f, paint)

        paint.textSize = 14f
        paint.isFakeBoldText = false
        canvas.drawText("Total Students: ${stats.totalStudents}", 70f, 160f, paint)
        canvas.drawText("Total Staff: ${stats.totalStaff}", 70f, 190f, paint)
        canvas.drawText("Estimated Revenue: Rs. ${stats.totalRevenue}", 70f, 220f, paint)
        canvas.drawText("Active Notices: ${stats.activeNoticeCount}", 70f, 250f, paint)

        // Footer
        paint.textSize = 10f
        paint.color = Color.GRAY
        canvas.drawText("This is an automatically generated system report.", 50f, 800f, paint)

        pdfDocument.finishPage(page)

        // Save to Downloads
        val fileName = "School_Report_${System.currentTimeMillis()}.pdf"
        val file = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName)

        try {
            pdfDocument.writeTo(FileOutputStream(file))
            Toast.makeText(context, "Report saved to: ${file.absolutePath}", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(context, "Failed to generate PDF: ${e.message}", Toast.LENGTH_SHORT).show()
        } finally {
            pdfDocument.close()
        }
    }

    fun generateResultCardPdf(
        context: Context,
        studentName: String,
        className: String,
        rollNo: String,
        examName: String,
        results: List<com.lodhidevelop.taleemiduniya_pro.data.model.ResultRecord>
    ) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 Size
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas
        val paint = Paint()

        // Header
        paint.color = Color.rgb(26, 35, 126) // Deep Indigo
        paint.textSize = 22f
        paint.isFakeBoldText = true
        canvas.drawText("TALEEMI DUNYA - EXAM MARKSHEET", 50f, 50f, paint)

        paint.textSize = 12f
        paint.color = Color.BLACK
        paint.isFakeBoldText = false
        val date = SimpleDateFormat("dd-MMM-yyyy", Locale.getDefault()).format(Date())
        canvas.drawText("Exam: $examName | Date: $date", 50f, 75f, paint)

        canvas.drawLine(50f, 90f, 545f, 90f, paint)

        // Student Info
        paint.textSize = 14f
        paint.isFakeBoldText = true
        canvas.drawText("Student Name: $studentName", 50f, 120f, paint)
        canvas.drawText("Class: $className | Roll No: $rollNo", 50f, 140f, paint)

        // Table Header
        paint.color = Color.rgb(240, 240, 240)
        canvas.drawRect(50f, 165f, 545f, 195f, paint)
        paint.color = Color.BLACK
        paint.textSize = 12f
        canvas.drawText("Subject", 60f, 185f, paint)
        canvas.drawText("Obtained Marks", 260f, 185f, paint)
        canvas.drawText("Total Marks", 380f, 185f, paint)
        canvas.drawText("Grade", 480f, 185f, paint)

        var y = 220f
        var totalObtained = 0
        var totalPossible = 0

        paint.isFakeBoldText = false
        results.forEach { res ->
            canvas.drawText(res.subject, 60f, y, paint)
            canvas.drawText(res.obtainedMarks.toString(), 260f, y, paint)
            canvas.drawText(res.totalMarks.toString(), 380f, y, paint)
            canvas.drawText(res.grade.ifEmpty { "-" }, 480f, y, paint)
            totalObtained += res.obtainedMarks
            totalPossible += res.totalMarks
            y += 25f
        }

        canvas.drawLine(50f, y, 545f, y, paint)
        y += 25f

        paint.isFakeBoldText = true
        canvas.drawText("Total Marks:", 60f, y, paint)
        canvas.drawText("$totalObtained / $totalPossible", 260f, y, paint)
        val percentage = if (totalPossible > 0) (totalObtained * 100) / totalPossible else 0
        canvas.drawText("Percentage: $percentage%", 380f, y, paint)

        // Footer
        paint.textSize = 10f
        paint.color = Color.GRAY
        paint.isFakeBoldText = false
        canvas.drawText("Official Marksheet generated via Taleemi Dunya Portal.", 50f, 800f, paint)

        pdfDocument.finishPage(page)

        val fileName = "Result_${studentName.replace(" ", "_")}_${System.currentTimeMillis()}.pdf"
        val file = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName)

        try {
            pdfDocument.writeTo(FileOutputStream(file))
            Toast.makeText(context, "Result Card saved: ${file.name}", Toast.LENGTH_LONG).show()
            val uri = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(android.content.Intent.createChooser(intent, "Open Result Card"))
        } catch (e: Exception) {
            Toast.makeText(context, "Saved to: ${file.absolutePath}", Toast.LENGTH_SHORT).show()
        } finally {
            pdfDocument.close()
        }
    }

    fun generateFeeReceiptPdf(
        context: Context,
        studentName: String,
        className: String,
        feeRecord: com.lodhidevelop.taleemiduniya_pro.data.model.FeeRecord
    ) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 Size
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas
        val paint = Paint()

        // Header
        paint.color = Color.rgb(46, 125, 50) // Forest Green
        paint.textSize = 22f
        paint.isFakeBoldText = true
        canvas.drawText("TALEEMI DUNYA - FEE RECEIPT", 50f, 50f, paint)

        paint.textSize = 12f
        paint.color = Color.BLACK
        paint.isFakeBoldText = false
        val date = SimpleDateFormat("dd-MMM-yyyy", Locale.getDefault()).format(Date())
        canvas.drawText("Voucher No: ${feeRecord.voucherNo} | Date: $date", 50f, 75f, paint)

        canvas.drawLine(50f, 90f, 545f, 90f, paint)

        // Details
        paint.textSize = 14f
        paint.isFakeBoldText = true
        canvas.drawText("Student Name: $studentName", 50f, 130f, paint)
        canvas.drawText("Class: $className", 50f, 155f, paint)
        canvas.drawText("Month: ${feeRecord.month}", 50f, 180f, paint)
        canvas.drawText("Total Amount: Rs. ${feeRecord.totalAmount}", 50f, 205f, paint)
        val paidAmt = if (feeRecord.paidAmount == 0) feeRecord.totalAmount else feeRecord.paidAmount
        canvas.drawText("Paid Amount: Rs. $paidAmt", 50f, 230f, paint)
        canvas.drawText("Payment Status: ${feeRecord.status}", 50f, 255f, paint)

        // Stamp box
        paint.color = Color.rgb(46, 125, 50)
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2f
        canvas.drawRect(350f, 130f, 500f, 230f, paint)
        paint.style = Paint.Style.FILL
        paint.textSize = 16f
        canvas.drawText(feeRecord.status.uppercase(), 380f, 180f, paint)

        // Footer
        paint.textSize = 10f
        paint.color = Color.GRAY
        paint.isFakeBoldText = false
        canvas.drawText("Official Digital Fee Receipt generated via Taleemi Dunya.", 50f, 800f, paint)

        pdfDocument.finishPage(page)

        val fileName = "Fee_Receipt_${feeRecord.month}_${System.currentTimeMillis()}.pdf"
        val file = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName)

        try {
            pdfDocument.writeTo(FileOutputStream(file))
            Toast.makeText(context, "Fee Receipt saved: ${file.name}", Toast.LENGTH_LONG).show()
            val uri = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(android.content.Intent.createChooser(intent, "Open Fee Receipt"))
        } catch (e: Exception) {
            Toast.makeText(context, "Saved to: ${file.absolutePath}", Toast.LENGTH_SHORT).show()
        } finally {
            pdfDocument.close()
        }
    }
}
