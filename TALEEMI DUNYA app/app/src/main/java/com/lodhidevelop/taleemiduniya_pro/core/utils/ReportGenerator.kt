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
}
