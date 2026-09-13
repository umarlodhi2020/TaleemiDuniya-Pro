package com.lodhidevelop.taleemiduniya_pro.data.model

data class StudentProfile(
    val id: String = "",
    val name: String = "",
    val fatherName: String = "",
    val fatherCnic: String = "",
    val rollNumber: String = "",
    val className: String = "",
    val section: String = "",
    val phone: String = "",
    val photoUrl: String = "",
    val status: String = "",
    val schoolId: String = "",
    val monthlyFee: Int = 0
)

data class AttendanceRecord(
    val date: String = "",
    val status: String = "",
    val checkInTime: String? = null,
    val studentId: String = "",
    val schoolId: String = ""
)

data class HomeworkRecord(
    val id: String = "",
    val subject: String = "",
    val title: String = "",
    val description: String = "",
    val className: String = "",
    val section: String = "",
    val attachmentUrl: String? = null,
    val dueDate: String = "",
    val assignedDate: String = "",
    val teacherName: String = "",
    val schoolId: String = "",
    val status: String = "Pending"
)

data class FeeRecord(
    val id: String = "",
    val month: String = "",
    val totalAmount: Int = 0,
    val paidAmount: Int = 0,
    val status: String = "", // Paid, Unpaid, Partial
    val voucherNo: String = "",
    val dueDate: String = "",
    val studentId: String = "",
    val schoolId: String = ""
)

data class ResultRecord(
    val id: String = "",
    val examId: String = "",
    val examName: String = "",
    val subject: String = "",
    val obtainedMarks: Int = 0,
    val totalMarks: Int = 0,
    val grade: String = "",
    val studentId: String = "",
    val schoolId: String = ""
)

data class TimetableRecord(
    val day: String = "",
    val subject: String = "",
    val time: String = "",
    val room: String = "",
    val teacherName: String = "",
    val className: String = "",
    val section: String = "",
    val teacherId: String = "",
    val schoolId: String = ""
)

data class Announcement(
    val id: String = "",
    val title: String = "",
    val desc: String = "",
    val type: String = "",
    val createdAt: Long = 0
)

data class TeacherProfile(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val schoolId: String = "",
    val designation: String = "",
    val section: String = "",
    val className: String = "", // Assigned class
    val photoUrl: String = ""
)

data class ClassInfo(
    val id: String = "",
    val name: String = "",
    val section: String = "",
    val schoolId: String = ""
)

data class LeaveRequest(
    val id: String = "",
    val staffId: String = "",
    val staffName: String = "",
    val reason: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val status: String = "Pending", // Pending, Approved, Rejected
    val schoolId: String = ""
)

data class StudentLeaveRequest(
    val id: String = "",
    val studentId: String = "",
    val studentName: String = "",
    val className: String = "",
    val section: String = "",
    val reason: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val status: String = "Pending", // Pending, Approved, Rejected
    val schoolId: String = ""
)

data class NotificationRecord(
    val id: String = "",
    val title: String = "",
    val body: String = "",
    val timestamp: Long = 0,
    val type: String = "general",
    val read: Boolean = false
)
