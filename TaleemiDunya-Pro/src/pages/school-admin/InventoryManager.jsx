import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ClipboardList,
  ArrowRightLeft,
  Edit2,
  Trash2,
  CheckCircle,
  RefreshCw,
  X,
  Send,
  Download,
  Filter,
  QrCode,
  Camera,
  ShoppingCart,
  UserCheck,
  User,
  Users,
  GraduationCap,
  Briefcase,
  Calendar,
  DollarSign,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  ChevronDown,
  Sparkles,
  Building,
  Phone,
  Clock,
  FileText,
  ScanBarcode,
  Eye,
  History,
  Tag,
  Box,
  AlertCircle,
  Receipt,
  Wallet
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'react-qr-code';
import { Html5Qrcode } from 'html5-qrcode';

// Audio Tone Feedback for Scanners & Actions
const playBeep = (type = 'success') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(165, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.debug('Audio not supported', e);
  }
};

const DEFAULT_CATEGORIES = [
  'All',
  'Books & Curriculum',
  'Stationery & Supplies',
  'Uniforms & Apparel',
  'Electronics & IT',
  'Furniture & Fixtures',
  'Lab Equipment',
  'Sports & Athletics'
];

const InventoryManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Taleemi Dunya Model Academy';

  // Active Main Tab: 'pos' (Sale/Issue POS) | 'items' (Catalog) | 'sales_ledger' (History) | 'purchases' (Restock)
  const [activeTab, setActiveTab] = useState('pos');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  // Primary Collections State
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  // Catalog Filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'available' | 'low_stock' | 'out_of_stock'

  // Sales Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all'); // 'all' | 'student' | 'staff' | 'sale' | 'issue' | 'fee_challan'
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('all'); // 'all' | 'pending_return' | 'returned' | 'completed'

  // ══════════════════════════════════════════════════════════════
  // POINT OF SALE & ISSUANCE (POS) STATE
  // ══════════════════════════════════════════════════════════════
  const [posMode, setPosMode] = useState('sale'); // 'sale' (Store Sale) | 'issue' (Lend Asset - Free/Returnable)
  
  // Item selection & Suggestion Dropdown
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [selectedPosItem, setSelectedPosItem] = useState(null);

  // Recipient selection & Suggestion Dropdown
  const [recipientType, setRecipientType] = useState('student'); // 'student' | 'staff' | 'walkin'
  const [recipientSearchInput, setRecipientSearchInput] = useState('');
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  // POS Form Values
  const [posQuantity, setPosQuantity] = useState(1);
  const [posUnitPrice, setPosUnitPrice] = useState(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState('fee_challan'); // 'fee_challan' (Add to Student Fee Record/Voucher) | 'cash' | 'online' | 'free_issue'
  const [posRemarks, setPosRemarks] = useState('');
  const [posReturnDate, setPosReturnDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // ══════════════════════════════════════════════════════════════
  // MODALS STATE
  // ══════════════════════════════════════════════════════════════
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockTargetItem, setRestockTargetItem] = useState(null);
  const [restockForm, setRestockForm] = useState({
    quantity: 10,
    costPrice: 0,
    supplierName: '',
    invoiceNo: '',
    notes: ''
  });

  const [isQrLabelModalOpen, setIsQrLabelModalOpen] = useState(false);
  const [qrLabelItem, setQrLabelItem] = useState(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState(null);

  // QR & Barcode Scanner State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerAction, setScannerAction] = useState('pos'); // 'pos' (Scan for sale/issue) | 'restock' (Scan to restock)
  const [scannerType, setScannerType] = useState('camera'); // 'camera' | 'barcode_gun'
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [scannerError, setScannerError] = useState('');
  const [barcodeGunInput, setBarcodeGunInput] = useState('');

  const html5QrCodeRef = useRef(null);
  const itemDropdownRef = useRef(null);
  const recipientDropdownRef = useRef(null);
  const barcodeGunInputRef = useRef(null);

  // New Item Form State
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'Stationery & Supplies',
    quantity: 20,
    unit: 'pcs',
    price: 500,
    costPrice: 350,
    room: 'Main Store Room',
    minStockAlert: 5
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
        setIsItemDropdownOpen(false);
      }
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target)) {
        setIsRecipientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all collections
  useEffect(() => {
    fetchAllData();
  }, [userData]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [itemsData, salesData, purchasesData, studentsData, staffData, vouchersData] = await Promise.all([
        getRecords('inventory', schoolId),
        getRecords('inventory_sales', schoolId),
        getRecords('inventory_purchases', schoolId),
        getRecords('students', schoolId),
        getRecords('staff', schoolId),
        getRecords('vouchers', schoolId)
      ]);

      // Items Catalog with Fallbacks
      if (itemsData && itemsData.length > 0) {
        setItems(itemsData);
      } else {
        setItems([
          { id: 'inv-101', name: 'Oxford Progressive English & Science (Grade 9-10)', category: 'Books & Curriculum', quantity: 45, unit: 'sets', price: 3400, costPrice: 2600, room: 'Book Depot Shelf A', minStockAlert: 10, status: 'available' },
          { id: 'inv-102', name: 'School Official Navy Blue Blazer & Uniform Kit', category: 'Uniforms & Apparel', quantity: 28, unit: 'sets', price: 4800, costPrice: 3600, room: 'Uniform Depot', minStockAlert: 5, status: 'available' },
          { id: 'inv-103', name: 'A4 Premium Paper Ream (500 Sheets 80gsm)', category: 'Stationery & Supplies', quantity: 6, unit: 'reams', price: 2100, costPrice: 1750, room: 'Admin Stationery Store', minStockAlert: 10, status: 'low_stock' },
          { id: 'inv-104', name: 'HP LaserJet Pro M28w Wireless Printer', category: 'Electronics & IT', quantity: 5, unit: 'pcs', price: 68000, costPrice: 58000, room: 'Admin Office', minStockAlert: 2, status: 'available' },
          { id: 'inv-105', name: 'High-Precision Binocular Optical Microscope', category: 'Lab Equipment', quantity: 12, unit: 'sets', price: 42000, costPrice: 34000, room: 'Biology Lab Cabinet 2', minStockAlert: 4, status: 'available' },
          { id: 'inv-106', name: 'Molten Match Football FIFA Approved Size 5', category: 'Sports & Athletics', quantity: 18, unit: 'pcs', price: 4500, costPrice: 3200, room: 'Sports Complex', minStockAlert: 5, status: 'available' },
          { id: 'inv-107', name: 'Magnetic Classroom Whiteboard (4x6 ft Aluminum Frame)', category: 'Furniture & Fixtures', quantity: 22, unit: 'pcs', price: 8500, costPrice: 6500, room: 'Store Room B', minStockAlert: 5, status: 'available' },
          { id: 'inv-108', name: 'Student Geometry & Mathematical Drawing Set', category: 'Stationery & Supplies', quantity: 0, unit: 'boxes', price: 450, costPrice: 300, room: 'Stationery Store', minStockAlert: 15, status: 'out_of_stock' }
        ]);
      }

      // Sales & Issuances with Fallbacks
      if (salesData && salesData.length > 0) {
        setSales(salesData);
      } else {
        setSales([
          {
            id: 'sale-1001',
            invoiceNo: 'INV-2026-0891',
            type: 'sale',
            recipientType: 'student',
            recipientName: 'Ahmed Raza',
            recipientDetail: 'Class 10-A (Roll # 101)',
            recipientPhone: '03001234567',
            itemId: 'inv-101',
            itemName: 'Oxford Progressive English & Science (Grade 9-10)',
            category: 'Books & Curriculum',
            quantity: 1,
            unit: 'sets',
            unitPrice: 3400,
            totalAmount: 3400,
            paymentMethod: 'cash',
            paymentStatus: 'paid',
            status: 'completed',
            remarks: 'Term 1 Course syllabus purchase',
            date: '2026-10-26 10:45 AM',
            createdAt: '2026-10-26T10:45:00.000Z'
          },
          {
            id: 'sale-1002',
            invoiceNo: 'ISS-2026-0312',
            type: 'issue',
            recipientType: 'staff',
            recipientName: 'Sir Usman Farooq',
            recipientDetail: 'Head of Physics Dept (Senior Faculty)',
            recipientPhone: '03011122334',
            itemId: 'inv-105',
            itemName: 'High-Precision Binocular Optical Microscope',
            category: 'Lab Equipment',
            quantity: 2,
            unit: 'sets',
            unitPrice: 42000,
            totalAmount: 84000,
            paymentMethod: 'free_issue',
            paymentStatus: 'free_assigned',
            status: 'issued',
            returnDate: '2026-11-15',
            remarks: 'Issued for Grade 10 Board Practical Examinations',
            date: '2026-10-25 09:30 AM',
            createdAt: '2026-10-25T09:30:00.000Z',
            returned: false
          },
          {
            id: 'sale-1003',
            invoiceNo: 'INV-2026-0892',
            type: 'sale',
            recipientType: 'student',
            recipientName: 'Fatima Noor',
            recipientDetail: 'Class 9-B (Roll # 104)',
            recipientPhone: '03129876543',
            itemId: 'inv-102',
            itemName: 'School Official Navy Blue Blazer & Uniform Kit',
            category: 'Uniforms & Apparel',
            quantity: 1,
            unit: 'sets',
            unitPrice: 4800,
            totalAmount: 4800,
            paymentMethod: 'fee_challan',
            paymentStatus: 'challan_added',
            addedToFeeRecord: true,
            status: 'completed',
            remarks: 'Added to October fee voucher / ledger',
            date: '2026-10-24 02:15 PM',
            createdAt: '2026-10-24T14:15:00.000Z'
          }
        ]);
      }

      // Purchases with Fallbacks
      if (purchasesData && purchasesData.length > 0) {
        setPurchases(purchasesData);
      } else {
        setPurchases([
          {
            id: 'pur-101',
            itemId: 'inv-101',
            itemName: 'Oxford Progressive English & Science (Grade 9-10)',
            quantityAdded: 50,
            unit: 'sets',
            costPrice: 2600,
            totalCost: 130000,
            supplierName: 'Oxford Regional Book Distributors',
            invoiceNo: 'OUP-9921',
            date: '2026-10-15',
            notes: 'Bulk purchase for Academic Year 2026-27'
          }
        ]);
      }

      // Students for Autocomplete & Fee Balance
      if (studentsData && studentsData.length > 0) {
        setStudents(studentsData);
      } else {
        setStudents([
          { id: 'std-1', name: 'Ahmed Raza', rollNumber: '101', class: 'Class 10-A', fatherName: 'Muhammad Raza', phone: '03001234567', balance: 0 },
          { id: 'std-2', name: 'Fatima Noor', rollNumber: '104', class: 'Class 9-B', fatherName: 'Noor Muhammad', phone: '03129876543', balance: 4800 },
          { id: 'std-3', name: 'Zain Ali', rollNumber: '112', class: 'Class 8-Green', fatherName: 'Tariq Ali', phone: '03215554433', balance: 500 },
          { id: 'std-4', name: 'Ayesha Khan', rollNumber: '108', class: 'Class 10-A', fatherName: 'Imran Khan', phone: '03337778899', balance: 0 },
          { id: 'std-5', name: 'Bilal Hassan', rollNumber: '119', class: 'Class 7-Blue', fatherName: 'Hassan Mehmood', phone: '03456667788', balance: 1200 },
          { id: 'std-6', name: 'Hamza Tariq', rollNumber: '105', class: 'Class 6-Rose', fatherName: 'Tariq Mehmood', phone: '03112233445', balance: 0 }
        ]);
      }

      // Staff for Autocomplete
      if (staffData && staffData.length > 0) {
        setStaffList(staffData);
      } else {
        setStaffList([
          { id: 'stf-1', name: 'Sir Usman Farooq', designation: 'Head of Physics Dept', department: 'Science Faculty', phone: '03011122334' },
          { id: 'stf-2', name: 'Maam Samina Bibi', designation: 'Senior English Teacher', department: 'Languages', phone: '03134455667' },
          { id: 'stf-3', name: 'Sir Kamran Akram', designation: 'Sports & Athletics Director', department: 'Sports', phone: '03228899001' },
          { id: 'stf-4', name: 'Mr. Asif Javed', designation: 'IT & Lab Network Incharge', department: 'Computer Science', phone: '03342233445' },
          { id: 'stf-5', name: 'Qari Abdul Rehman', designation: 'Senior Arabic & Islamic Studies', department: 'Islamic Studies', phone: '03457788990' }
        ]);
      }

      if (vouchersData && vouchersData.length > 0) {
        setVouchers(vouchersData);
      }
    } catch (err) {
      console.error('Error fetching inventory hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find detailed selected student record (to view arrears/balance)
  const selectedStudentObj = useMemo(() => {
    if (recipientType !== 'student' || !selectedRecipient?.id) return null;
    return students.find(s => s.id === selectedRecipient.id) || null;
  }, [recipientType, selectedRecipient, students]);

  // Current fee balance for selected student
  const studentCurrentFeeBalance = useMemo(() => {
    if (!selectedStudentObj) return 0;
    const val = selectedStudentObj.balance !== undefined
      ? selectedStudentObj.balance
      : (selectedStudentObj.arrears !== undefined ? selectedStudentObj.arrears : 0);
    return Number(val) || 0;
  }, [selectedStudentObj]);

  // ══════════════════════════════════════════════════════════════
  // FILTERED LISTS
  // ══════════════════════════════════════════════════════════════
  const filteredCatalogItems = useMemo(() => {
    return items.filter(item => {
      const q = catalogSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.room || '').toLowerCase().includes(q);

      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;

      let matchStatus = true;
      if (stockStatusFilter === 'out_of_stock') {
        matchStatus = Number(item.quantity || 0) <= 0;
      } else if (stockStatusFilter === 'low_stock') {
        matchStatus = Number(item.quantity || 0) > 0 && Number(item.quantity || 0) <= Number(item.minStockAlert || 5);
      } else if (stockStatusFilter === 'available') {
        matchStatus = Number(item.quantity || 0) > Number(item.minStockAlert || 5);
      }

      return matchSearch && matchCategory && matchStatus;
    });
  }, [items, catalogSearch, selectedCategory, stockStatusFilter]);

  // Autocomplete Suggestions for Item Input
  const itemSuggestions = useMemo(() => {
    const q = itemSearchInput.toLowerCase().trim();
    if (!q) return items.slice(0, 8);
    return items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.id || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [items, itemSearchInput]);

  // Autocomplete Suggestions for Recipient Input (Student or Staff)
  const recipientSuggestions = useMemo(() => {
    const q = recipientSearchInput.toLowerCase().trim();
    if (recipientType === 'student') {
      if (!q) return students.slice(0, 8);
      return students.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.studentName || '').toLowerCase().includes(q) ||
        (s.rollNumber || s.rollNo || '').toLowerCase().includes(q) ||
        (s.class || '').toLowerCase().includes(q)
      ).slice(0, 10);
    } else if (recipientType === 'staff') {
      if (!q) return staffList.slice(0, 8);
      return staffList.filter(st =>
        (st.name || '').toLowerCase().includes(q) ||
        (st.designation || '').toLowerCase().includes(q) ||
        (st.department || '').toLowerCase().includes(q)
      ).slice(0, 10);
    }
    return [];
  }, [recipientType, students, staffList, recipientSearchInput]);

  // Filtered Sales & Issuances Ledger
  const filteredSales = useMemo(() => {
    return sales.filter(record => {
      const q = ledgerSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (record.invoiceNo || '').toLowerCase().includes(q) ||
        (record.recipientName || '').toLowerCase().includes(q) ||
        (record.recipientDetail || '').toLowerCase().includes(q) ||
        (record.itemName || '').toLowerCase().includes(q) ||
        (record.category || '').toLowerCase().includes(q);

      let matchType = true;
      if (ledgerTypeFilter === 'student') matchType = record.recipientType === 'student';
      else if (ledgerTypeFilter === 'staff') matchType = record.recipientType === 'staff';
      else if (ledgerTypeFilter === 'sale') matchType = record.type === 'sale';
      else if (ledgerTypeFilter === 'issue') matchType = record.type === 'issue';
      else if (ledgerTypeFilter === 'fee_challan') matchType = record.paymentMethod === 'fee_challan' || record.addedToFeeRecord;

      let matchStatus = true;
      if (ledgerStatusFilter === 'pending_return') matchStatus = record.type === 'issue' && !record.returned;
      else if (ledgerStatusFilter === 'returned') matchStatus = record.type === 'issue' && record.returned;
      else if (ledgerStatusFilter === 'completed') matchStatus = record.type === 'sale';

      return matchSearch && matchType && matchStatus;
    });
  }, [sales, ledgerSearch, ledgerTypeFilter, ledgerStatusFilter]);

  // ══════════════════════════════════════════════════════════════
  // KPI CALCULATIONS
  // ══════════════════════════════════════════════════════════════
  const totalStockUnits = useMemo(() => items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0), [items]);
  const totalValuation = useMemo(() => items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.price) || 0)), 0), [items]);
  const totalSalesRevenue = useMemo(() => {
    return sales
      .filter(s => s.type === 'sale')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  }, [sales]);
  const totalAddedToFeeChallans = useMemo(() => {
    return sales
      .filter(s => s.paymentMethod === 'fee_challan' || s.addedToFeeRecord)
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  }, [sales]);
  const lowStockCount = useMemo(() => {
    return items.filter(i => (Number(i.quantity) || 0) <= (Number(i.minStockAlert) || 5)).length;
  }, [items]);
  const activeIssuedCount = useMemo(() => {
    return sales.filter(s => s.type === 'issue' && !s.returned).reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
  }, [sales]);

  // ══════════════════════════════════════════════════════════════
  // POS ACTIONS (SELECT ITEM, SELECT RECIPIENT, COMPLETE TRANSACTION)
  // ══════════════════════════════════════════════════════════════
  const handleSelectItem = (item) => {
    setSelectedPosItem(item);
    setItemSearchInput(item.name);
    setPosUnitPrice(item.price || 0);
    setPosQuantity(1);
    setIsItemDropdownOpen(false);
    playBeep('success');
  };

  const handleSelectRecipient = (recipient) => {
    setSelectedRecipient(recipient);
    if (recipientType === 'student') {
      const name = recipient.name || recipient.studentName || 'Student';
      const detail = `${recipient.class || 'Class N/A'} (Roll # ${recipient.rollNumber || recipient.rollNo || '-'})`;
      setRecipientSearchInput(name);
      setSelectedRecipient({
        id: recipient.id,
        name,
        detail,
        phone: recipient.phone || recipient.parentPhone || '',
        balance: recipient.balance || recipient.arrears || 0
      });
    } else if (recipientType === 'staff') {
      const name = recipient.name || 'Staff';
      const detail = `${recipient.designation || 'Staff'} - ${recipient.department || ''}`;
      setRecipientSearchInput(name);
      setSelectedRecipient({
        id: recipient.id,
        name,
        detail,
        phone: recipient.phone || ''
      });
    }
    setIsRecipientDropdownOpen(false);
    playBeep('success');
  };

  // COMPLETE SALE / ISSUE TRANSACTION
  const handleCompletePosTransaction = async (e) => {
    e?.preventDefault();

    if (!selectedPosItem) {
      alert('Please select an inventory item using the search dropdown or QR scan.');
      return;
    }

    if (posQuantity <= 0) {
      alert('Quantity must be at least 1.');
      return;
    }

    if (posQuantity > Number(selectedPosItem.quantity)) {
      alert(`Cannot process ${posQuantity} ${selectedPosItem.unit || 'units'}. Only ${selectedPosItem.quantity} currently available in stock!`);
      return;
    }

    // Determine recipient details
    let finalRecipientName = '';
    let finalRecipientDetail = '';
    let finalRecipientPhone = '';

    if (selectedRecipient) {
      finalRecipientName = selectedRecipient.name;
      finalRecipientDetail = selectedRecipient.detail;
      finalRecipientPhone = selectedRecipient.phone || '';
    } else if (recipientSearchInput.trim()) {
      finalRecipientName = recipientSearchInput.trim();
      finalRecipientDetail = recipientType === 'student' ? 'Student (Manual Entry)' : (recipientType === 'staff' ? 'Staff (Manual Entry)' : 'Walk-in Customer');
    } else {
      alert('Please specify the recipient (Student, Staff, or Customer name).');
      return;
    }

    const isSale = posMode === 'sale';
    const totalAmount = isSale ? (Number(posQuantity) * Number(posUnitPrice)) : 0;
    const invPrefix = isSale ? 'INV' : 'ISS';
    const timestamp = Date.now().toString().slice(-4);
    const invoiceNo = `${invPrefix}-${new Date().getFullYear()}-${timestamp}`;

    const newSaleRecord = {
      schoolId,
      invoiceNo,
      type: posMode,
      recipientType,
      recipientId: selectedRecipient?.id || 'manual',
      recipientName: finalRecipientName,
      recipientDetail: finalRecipientDetail,
      recipientPhone: finalRecipientPhone,
      itemId: selectedPosItem.id,
      itemName: selectedPosItem.name,
      category: selectedPosItem.category || 'General',
      quantity: Number(posQuantity),
      unit: selectedPosItem.unit || 'pcs',
      unitPrice: Number(posUnitPrice),
      totalAmount,
      paymentMethod: isSale ? posPaymentMethod : 'free_issue',
      paymentStatus: isSale ? (posPaymentMethod === 'fee_challan' ? 'challan_added' : 'paid') : 'free_assigned',
      status: isSale ? 'completed' : 'issued',
      returnDate: isSale ? null : posReturnDate,
      returned: false,
      remarks: posRemarks || (isSale ? (posPaymentMethod === 'fee_challan' ? 'Charged to student monthly fee voucher' : 'Store counter sale') : 'Issued for school use'),
      date: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      createdAt: new Date().toISOString()
    };

    // ══════════════════════════════════════════════════════════════
    // FEE RECORD INTEGRATION (ADD PRODUCT CHARGES TO STUDENT FEE RECORD / VOUCHER)
    // ══════════════════════════════════════════════════════════════
    if (isSale && recipientType === 'student' && selectedRecipient?.id && posPaymentMethod === 'fee_challan') {
      try {
        const studentDoc = students.find(s => s.id === selectedRecipient.id);
        const currentBal = Number(studentDoc?.balance !== undefined ? studentDoc.balance : (studentDoc?.arrears || 0)) || 0;
        const newBal = currentBal + totalAmount;

        const productChargeItem = {
          id: 'prod-' + Date.now(),
          invoiceNo,
          itemName: selectedPosItem.name,
          category: selectedPosItem.category || 'General',
          quantity: Number(posQuantity),
          unit: selectedPosItem.unit || 'pcs',
          unitPrice: Number(posUnitPrice),
          totalAmount,
          date: new Date().toISOString().split('T')[0],
          status: 'unbilled'
        };

        const existingPending = Array.isArray(studentDoc?.pendingProductCharges) ? studentDoc.pendingProductCharges : [];
        const updatedPending = [...existingPending, productChargeItem];

        // 1. Update Student document in DB (balance, arrears, pendingProductCharges)
        if (!selectedRecipient.id.startsWith('std-')) {
          await updateRecord('students', selectedRecipient.id, {
            balance: newBal,
            arrears: newBal,
            pendingProductCharges: updatedPending
          });
        }

        // 2. Check if an active Unpaid voucher exists for this student
        const studentVouchers = vouchers.filter(v =>
          (v.studentId === selectedRecipient.id || v.studentName === finalRecipientName) &&
          v.status === 'Unpaid'
        );

        let linkedVoucherNo = null;
        if (studentVouchers.length > 0) {
          const latestUnpaidVoucher = studentVouchers[0];
          const currentItems = Array.isArray(latestUnpaidVoucher.feeItems) ? [...latestUnpaidVoucher.feeItems] : [];
          currentItems.push({
            name: `${selectedPosItem.category || 'Store Item'}: ${selectedPosItem.name} (${posQuantity}x)`,
            amount: totalAmount,
            isProductCharge: true,
            productInvoiceNo: invoiceNo
          });

          const updatedVoucherTotal = Number(latestUnpaidVoucher.totalAmount || 0) + totalAmount;

          if (!latestUnpaidVoucher.id.startsWith('vouch-')) {
            await updateRecord('vouchers', latestUnpaidVoucher.id, {
              feeItems: currentItems,
              totalAmount: updatedVoucherTotal
            });
          }

          linkedVoucherNo = latestUnpaidVoucher.voucherNo || latestUnpaidVoucher.id;
          setVouchers(vouchers.map(v => v.id === latestUnpaidVoucher.id ? {
            ...v,
            feeItems: currentItems,
            totalAmount: updatedVoucherTotal
          } : v));
        }

        // Update local student state so autocomplete reflects new balance immediately
        setStudents(students.map(s => s.id === selectedRecipient.id ? {
          ...s,
          balance: newBal,
          arrears: newBal,
          pendingProductCharges: updatedPending
        } : s));

        newSaleRecord.addedToFeeRecord = true;
        newSaleRecord.linkedVoucher = linkedVoucherNo ? `Voucher #${linkedVoucherNo}` : 'Next Monthly Fee Voucher';
        newSaleRecord.newStudentBalance = newBal;
      } catch (err) {
        console.error('Error integrating with student fee record:', err);
      }
    }

    // Update stock quantity on the item
    const newQty = Number(selectedPosItem.quantity) - Number(posQuantity);
    const updatedStatus = newQty === 0 ? 'out_of_stock' : (newQty <= (selectedPosItem.minStockAlert || 5) ? 'low_stock' : 'available');

    try {
      // Save sale record
      const addedDoc = await addRecord('inventory_sales', newSaleRecord, schoolId);
      newSaleRecord.id = addedDoc?.id || ('sale-' + Date.now());

      // Update inventory item in database
      if (!selectedPosItem.id.startsWith('inv-')) {
        await updateRecord('inventory', selectedPosItem.id, {
          quantity: newQty,
          status: updatedStatus
        });
      }
    } catch (err) {
      newSaleRecord.id = 'sale-' + Date.now();
      console.warn('DB update fallback to local', err);
    }

    // Update local state
    setSales([newSaleRecord, ...sales]);
    setItems(items.map(i => i.id === selectedPosItem.id ? { ...i, quantity: newQty, status: updatedStatus } : i));

    playBeep('success');

    if (posPaymentMethod === 'fee_challan' && isSale) {
      showToast(`💳 PKR ${totalAmount.toLocaleString()} of "${selectedPosItem.name}" added to ${finalRecipientName}'s Fee Record & Voucher!`);
    } else {
      showToast(`✅ ${isSale ? 'Store Sale' : 'Asset Issuance'} of ${posQuantity} ${selectedPosItem.unit} recorded successfully!`);
    }

    // Prompt to view printable receipt
    setReceiptRecord(newSaleRecord);
    setIsReceiptModalOpen(true);

    // Reset POS form
    setSelectedPosItem(null);
    setItemSearchInput('');
    setSelectedRecipient(null);
    setRecipientSearchInput('');
    setPosQuantity(1);
    setPosRemarks('');
  };

  // ══════════════════════════════════════════════════════════════
  // RETURN ITEM TO STOCK (FOR ISSUED ASSETS)
  // ══════════════════════════════════════════════════════════════
  const handleReturnItemToStock = async (saleRecord) => {
    if (!window.confirm(`Confirm returning ${saleRecord.quantity} ${saleRecord.unit || 'units'} of "${saleRecord.itemName}" back into school inventory?`)) {
      return;
    }

    const targetItem = items.find(i => i.id === saleRecord.itemId);
    const restoredQty = (targetItem ? Number(targetItem.quantity) : 0) + Number(saleRecord.quantity);
    const restoredStatus = restoredQty > (targetItem?.minStockAlert || 5) ? 'available' : (restoredQty > 0 ? 'low_stock' : 'out_of_stock');

    const updatedSale = {
      ...saleRecord,
      returned: true,
      status: 'returned',
      returnedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    };

    try {
      if (!saleRecord.id.startsWith('sale-')) {
        await updateRecord('inventory_sales', saleRecord.id, {
          returned: true,
          status: 'returned',
          returnedAt: updatedSale.returnedAt
        });
      }

      if (targetItem && !targetItem.id.startsWith('inv-')) {
        await updateRecord('inventory', targetItem.id, {
          quantity: restoredQty,
          status: restoredStatus
        });
      }
    } catch (err) {
      console.warn('Local update fallback', err);
    }

    setSales(sales.map(s => s.id === saleRecord.id ? updatedSale : s));
    if (targetItem) {
      setItems(items.map(i => i.id === targetItem.id ? { ...i, quantity: restoredQty, status: restoredStatus } : i));
    }

    playBeep('success');
    showToast(`🔄 Asset "${saleRecord.itemName}" returned to stock! Available units updated to ${restoredQty}.`);
  };

  // ══════════════════════════════════════════════════════════════
  // RESTOCK / PURCHASE ACTION
  // ══════════════════════════════════════════════════════════════
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockTargetItem) return;

    const addQty = Number(restockForm.quantity);
    if (addQty <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    const newQty = Number(restockTargetItem.quantity) + addQty;
    const newStatus = newQty > (restockTargetItem.minStockAlert || 5) ? 'available' : 'low_stock';
    const totalCost = addQty * Number(restockForm.costPrice || restockTargetItem.costPrice || 0);

    const purchaseRecord = {
      schoolId,
      itemId: restockTargetItem.id,
      itemName: restockTargetItem.name,
      quantityAdded: addQty,
      unit: restockTargetItem.unit || 'pcs',
      costPrice: Number(restockForm.costPrice || restockTargetItem.costPrice || 0),
      totalCost,
      supplierName: restockForm.supplierName || 'General Supplier',
      invoiceNo: restockForm.invoiceNo || `PUR-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      notes: restockForm.notes || 'Routine restock',
      createdAt: new Date().toISOString()
    };

    try {
      const addedDoc = await addRecord('inventory_purchases', purchaseRecord, schoolId);
      purchaseRecord.id = addedDoc?.id || ('pur-' + Date.now());

      if (!restockTargetItem.id.startsWith('inv-')) {
        await updateRecord('inventory', restockTargetItem.id, {
          quantity: newQty,
          status: newStatus
        });
      }
    } catch (err) {
      purchaseRecord.id = 'pur-' + Date.now();
      console.warn('Local update fallback', err);
    }

    setPurchases([purchaseRecord, ...purchases]);
    setItems(items.map(i => i.id === restockTargetItem.id ? { ...i, quantity: newQty, status: newStatus } : i));
    setIsRestockModalOpen(false);
    setRestockTargetItem(null);

    playBeep('success');
    showToast(`🛒 Restocked ${addQty} ${restockTargetItem.unit} for "${restockTargetItem.name}" successfully!`);
  };

  // ══════════════════════════════════════════════════════════════
  // QR & BARCODE SCANNER LOGIC
  // ══════════════════════════════════════════════════════════════
  const handleOpenScanner = (action = 'pos') => {
    setScannerAction(action);
    setScannerError('');
    setIsScannerModalOpen(true);
  };

  const handleScanDetected = (decodedText) => {
    if (!decodedText) return;
    const cleanId = decodedText.trim();
    playBeep('success');

    // Look for matching item by id or barcode/name
    const foundItem = items.find(i =>
      i.id.toLowerCase() === cleanId.toLowerCase() ||
      i.name.toLowerCase() === cleanId.toLowerCase()
    );

    if (foundItem) {
      setIsScannerModalOpen(false);
      stopCameraScanner();

      if (scannerAction === 'pos') {
        setActiveTab('pos');
        handleSelectItem(foundItem);
        showToast(`🎯 Item Scanned: "${foundItem.name}" (${foundItem.quantity} in stock)`);
      } else if (scannerAction === 'restock') {
        setRestockTargetItem(foundItem);
        setRestockForm({
          quantity: 10,
          costPrice: foundItem.costPrice || 0,
          supplierName: '',
          invoiceNo: '',
          notes: ''
        });
        setIsRestockModalOpen(true);
      }
    } else {
      playBeep('error');
      setScannerError(`No item in store matches code "${cleanId}". You can register this item first.`);
    }
  };

  const startCameraScanner = async () => {
    setScannerError('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('inventory-camera-box');
      }
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      await html5QrCodeRef.current.start(
        { facingMode: cameraFacing },
        { fps: 22, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          handleScanDetected(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.warn('Camera failed:', err);
      setScannerError('Camera access unavailable. Switched to 2D Barcode Gun / Manual input mode.');
      setScannerType('barcode_gun');
    }
  };

  const stopCameraScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  useEffect(() => {
    if (isScannerModalOpen && scannerType === 'camera') {
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopCameraScanner();
    }
  }, [isScannerModalOpen, scannerType, cameraFacing]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [stopCameraScanner]);

  const handleBarcodeGunSubmit = (e) => {
    e.preventDefault();
    if (!barcodeGunInput.trim()) return;
    handleScanDetected(barcodeGunInput.trim());
    setBarcodeGunInput('');
  };

  // ══════════════════════════════════════════════════════════════
  // ADD / EDIT / DELETE ASSET IN CATALOG
  // ══════════════════════════════════════════════════════════════
  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    if (!newItemForm.name || !newItemForm.price) {
      alert('Please enter item name and sale price.');
      return;
    }

    const newItem = {
      ...newItemForm,
      schoolId,
      quantity: Number(newItemForm.quantity),
      price: Number(newItemForm.price),
      costPrice: Number(newItemForm.costPrice || 0),
      minStockAlert: Number(newItemForm.minStockAlert || 5),
      status: Number(newItemForm.quantity) <= 0 ? 'out_of_stock' : (Number(newItemForm.quantity) <= Number(newItemForm.minStockAlert) ? 'low_stock' : 'available'),
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      const addedDoc = await addRecord('inventory', newItem, schoolId);
      newItem.id = addedDoc?.id || ('inv-' + Date.now().toString().slice(-4));
    } catch (err) {
      newItem.id = 'inv-' + Date.now().toString().slice(-4);
    }

    setItems([newItem, ...items]);
    setIsAddModalOpen(false);
    setNewItemForm({
      name: '',
      category: 'Stationery & Supplies',
      quantity: 20,
      unit: 'pcs',
      price: 500,
      costPrice: 350,
      room: 'Main Store Room',
      minStockAlert: 5
    });

    playBeep('success');
    showToast(`✅ Asset "${newItem.name}" added to inventory catalog!`);
  };

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedItem = {
      ...editingItem,
      quantity: Number(editingItem.quantity),
      price: Number(editingItem.price),
      costPrice: Number(editingItem.costPrice || 0),
      minStockAlert: Number(editingItem.minStockAlert || 5),
      status: Number(editingItem.quantity) <= 0 ? 'out_of_stock' : (Number(editingItem.quantity) <= Number(editingItem.minStockAlert || 5) ? 'low_stock' : 'available')
    };

    try {
      if (!updatedItem.id.startsWith('inv-')) {
        await updateRecord('inventory', updatedItem.id, updatedItem);
      }
    } catch (err) {
      console.warn('Local update fallback', err);
    }

    setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
    setIsEditModalOpen(false);
    setEditingItem(null);

    playBeep('success');
    showToast(`✏️ Asset "${updatedItem.name}" updated successfully!`);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Permanently delete "${item.name}" from school inventory?`)) return;

    try {
      if (!item.id.startsWith('inv-')) {
        await deleteRecord('inventory', item.id);
      }
    } catch (err) {
      console.warn('Local delete fallback', err);
    }

    setItems(items.filter(i => i.id !== item.id));
    showToast(`🗑️ Asset "${item.name}" deleted.`);
  };

  // CSV Exports
  const handleExportStockReport = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['SKU / ID,Item Name,Category,Quantity,Unit,Unit Price (PKR),Cost Price (PKR),Total Value (PKR),Room / Location,Status']
        .concat(items.map(i =>
          `"${i.id}","${i.name}","${i.category}",${i.quantity},"${i.unit || 'pcs'}",${i.price},${i.costPrice || 0},${(i.quantity || 0) * (i.price || 0)},"${i.room || '-'}","${i.status || 'available'}"`
        )).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `School_Inventory_Stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Inventory Stock exported as CSV successfully!');
  };

  const handleExportSalesLedger = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['Invoice No,Type,Recipient Type,Recipient Name,Details,Item Name,Category,Quantity,Unit,Total Amount (PKR),Payment Method,Fee Record Integration,Status,Date']
        .concat(sales.map(s =>
          `"${s.invoiceNo}","${s.type}","${s.recipientType}","${s.recipientName}","${s.recipientDetail || '-'}","${s.itemName}","${s.category}",${s.quantity},"${s.unit}",${s.totalAmount},"${s.paymentMethod}","${s.addedToFeeRecord ? 'Yes (Added to Voucher)' : 'No'}","${s.status}","${s.date}"`
        )).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Sales_and_Issuance_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Sales & Issuance Ledger exported as CSV successfully!');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400/50 font-bold text-sm flex items-center gap-2.5 backdrop-blur-md animate-bounce">
          <CheckCircle size={18} className="shrink-0 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAGE HEADER & PRIMARY QUICK ACTION BUTTONS
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-white bg-premium-gradient bg-clip-text text-transparent">
              Inventory & Assets POS Hub
            </h1>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Fee Voucher Linked
            </span>
          </div>
          <p className="text-dark-muted mt-1 text-xs md:text-sm">
            Scan QR/Barcodes, smart dropdown autocomplete, and auto-add product fees (Uniform, Books, ID Cards) to Student Fee Records & Vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Navigate to Generate Voucher */}
          <button
            onClick={() => navigate('/school-admin/generate-voucher')}
            className="px-3.5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
            title="Go to Fee Voucher Generator"
          >
            <Receipt size={16} />
            <span>Generate Vouchers</span>
          </button>

          {/* Launch Scanner Button */}
          <button
            onClick={() => handleOpenScanner('pos')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all hover:scale-105"
          >
            <ScanBarcode size={17} />
            <span>Scan QR / Barcode</span>
          </button>

          {/* Add New Asset Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="premium-button-primary py-2.5 px-4 flex items-center gap-2 text-xs cursor-pointer shadow-lg shadow-primary-500/20"
          >
            <Plus size={16} />
            <span>Add New Item</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchAllData}
            title="Refresh All Store Data"
            className="p-2.5 bg-dark-hover hover:bg-dark-card border border-dark-border rounded-xl text-dark-muted hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary-500' : ''} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          KEY STATS CARDS (5 METRICS)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Items */}
        <GlassCard className="p-4 border-l-4 border-l-primary-500 bg-primary-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
              <Package size={22} />
            </div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-wider">Total Stock Units</p>
              <h3 className="text-xl font-black text-white mt-0.5">{totalStockUnits.toLocaleString()}</h3>
            </div>
          </div>
        </GlassCard>

        {/* Total Stock Valuation */}
        <GlassCard className="p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-wider">Stock Valuation</p>
              <h3 className="text-xl font-black text-white mt-0.5">PKR {totalValuation.toLocaleString()}</h3>
            </div>
          </div>
        </GlassCard>

        {/* Store Sales Revenue */}
        <GlassCard className="p-4 border-l-4 border-l-cyan-500 bg-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-wider">Direct Store Cash</p>
              <h3 className="text-xl font-black text-white mt-0.5">PKR {totalSalesRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </GlassCard>

        {/* Added to Student Fee Vouchers */}
        <GlassCard className="p-4 border-l-4 border-l-purple-500 bg-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Receipt size={22} />
            </div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-wider">In Fee Vouchers</p>
              <h3 className="text-xl font-black text-purple-400 mt-0.5">PKR {totalAddedToFeeChallans.toLocaleString()}</h3>
            </div>
          </div>
        </GlassCard>

        {/* Low Stock Alerts */}
        <GlassCard className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-wider">Low Stock Warnings</p>
              <h3 className="text-xl font-black text-amber-400 mt-0.5">{lowStockCount} <span className="text-[10px] text-amber-400/80 font-normal">Restock</span></h3>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MAIN NAVIGATION TABS
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-dark-border pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pos'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-dark-muted hover:text-white bg-dark-card/50 hover:bg-dark-card border border-dark-border'
          }`}
        >
          <ShoppingCart size={15} />
          <span>1. Point of Sale & Issuance (POS)</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'items'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-dark-muted hover:text-white bg-dark-card/50 hover:bg-dark-card border border-dark-border'
          }`}
        >
          <Box size={15} />
          <span>2. Stock Catalog & Assets ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sales_ledger')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sales_ledger'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-dark-muted hover:text-white bg-dark-card/50 hover:bg-dark-card border border-dark-border'
          }`}
        >
          <FileText size={15} />
          <span>3. Sales & Issuance Ledger ({sales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-dark-muted hover:text-white bg-dark-card/50 hover:bg-dark-card border border-dark-border'
          }`}
        >
          <History size={15} />
          <span>4. Restock & Purchases Log ({purchases.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: POINT OF SALE & ISSUANCE (POS)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: ITEM SELECTION & RECIPIENT SMART DROPDOWNS */}
          <div className="lg:col-span-7 space-y-6">
            <GlassCard className="p-6 space-y-6">
              {/* POS Mode Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-dark-border">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="text-primary-400" size={18} />
                    Issue or Sell Store Items
                  </h2>
                  <p className="text-xs text-dark-muted">
                    Sell books/uniforms, add charges to student fee vouchers, or assign equipment to staff.
                  </p>
                </div>

                <div className="flex items-center bg-dark-hover p-1 rounded-xl border border-dark-border">
                  <button
                    type="button"
                    onClick={() => {
                      setPosMode('sale');
                      setPosPaymentMethod('fee_challan');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      posMode === 'sale'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-dark-muted hover:text-white'
                    }`}
                  >
                    <DollarSign size={13} />
                    <span>Store Sale (Books / Uniform)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosMode('issue');
                      setPosPaymentMethod('free_issue');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      posMode === 'issue'
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-dark-muted hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft size={13} />
                    <span>Asset Issue (Lend / Returnable)</span>
                  </button>
                </div>
              </div>

              {/* STEP 1: ITEM SELECTION WITH AUTOCOMPLETE DROPDOWN */}
              <div className="space-y-2 relative" ref={itemDropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-dark-muted flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[10px]">1</span>
                    Select Store Item / Asset *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenScanner('pos')}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera size={13} /> Scan QR / Barcode
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
                  <input
                    type="text"
                    placeholder="Type to search items by name, SKU, or category..."
                    value={itemSearchInput}
                    onChange={(e) => {
                      setItemSearchInput(e.target.value);
                      setIsItemDropdownOpen(true);
                    }}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:border-primary-500 outline-none transition-colors"
                  />
                  {itemSearchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemSearchInput('');
                        setSelectedPosItem(null);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* ITEM SUGGESTIONS DROPDOWN */}
                {isItemDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-dark-card border border-primary-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar backdrop-blur-xl divide-y divide-dark-border/50 animate-fade-in">
                    <div className="p-2.5 bg-dark-hover/70 text-[10px] uppercase font-black tracking-wider text-dark-muted flex items-center justify-between">
                      <span>Matching Inventory Items ({itemSuggestions.length})</span>
                      <span>Click to Select</span>
                    </div>

                    {itemSuggestions.length === 0 ? (
                      <div className="p-6 text-center text-dark-muted text-xs">
                        No store items found matching "{itemSearchInput}".
                      </div>
                    ) : (
                      itemSuggestions.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className={`p-3.5 hover:bg-primary-500/10 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            selectedPosItem?.id === item.id ? 'bg-primary-500/15 border-l-4 border-l-primary-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-400 flex items-center justify-center font-black text-xs shrink-0">
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-dark-muted">
                                <span className="font-mono text-cyan-400">{item.id}</span>
                                <span>•</span>
                                <span>{item.category}</span>
                                <span>•</span>
                                <span>📍 {item.room || 'Store'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-emerald-400">PKR {Number(item.price).toLocaleString()}</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              item.quantity <= 0
                                ? 'bg-red-500/20 text-red-400'
                                : (item.quantity <= (item.minStockAlert || 5)
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400')
                            }`}>
                              {item.quantity} {item.unit || 'pcs'} left
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Item Card Badge */}
                {selectedPosItem && (
                  <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-primary-400 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-black text-white">{selectedPosItem.name}</p>
                        <p className="text-[11px] text-dark-muted">
                          Available: <strong className="text-emerald-400">{selectedPosItem.quantity} {selectedPosItem.unit || 'pcs'}</strong> | Unit Price: <strong>PKR {Number(selectedPosItem.price).toLocaleString()}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPosItem(null)}
                      className="text-xs text-dark-muted hover:text-red-400 font-bold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: RECIPIENT SELECTION WITH AUTOCOMPLETE DROPDOWN */}
              <div className="space-y-2 relative" ref={recipientDropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-dark-muted flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
                    Recipient: Who is Receiving / Purchasing? *
                  </label>

                  {/* Recipient Type Toggle */}
                  <div className="flex items-center gap-1 bg-dark-hover p-1 rounded-xl border border-dark-border">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientType('student');
                        setSelectedRecipient(null);
                        setRecipientSearchInput('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                        recipientType === 'student'
                          ? 'bg-cyan-500 text-black shadow'
                          : 'text-dark-muted hover:text-white'
                      }`}
                    >
                      <GraduationCap size={12} /> Student
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecipientType('staff');
                        setSelectedRecipient(null);
                        setRecipientSearchInput('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                        recipientType === 'staff'
                          ? 'bg-purple-500 text-white shadow'
                          : 'text-dark-muted hover:text-white'
                      }`}
                    >
                      <Briefcase size={12} /> Staff
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecipientType('walkin');
                        setSelectedRecipient(null);
                        setRecipientSearchInput('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                        recipientType === 'walkin'
                          ? 'bg-emerald-500 text-white shadow'
                          : 'text-dark-muted hover:text-white'
                      }`}
                    >
                      <User size={12} /> Walk-in
                    </button>
                  </div>
                </div>

                <div className="relative">
                  {recipientType === 'student' ? (
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" size={17} />
                  ) : (
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={17} />
                  )}

                  <input
                    type="text"
                    placeholder={
                      recipientType === 'student'
                        ? 'Type student name, roll number, or grade (e.g. Ahmed, 101, Class 9)...'
                        : (recipientType === 'staff'
                            ? 'Type teacher name, designation, or department (e.g. Usman, Physics)...'
                            : 'Enter customer / visitor name...')
                    }
                    value={recipientSearchInput}
                    onChange={(e) => {
                      setRecipientSearchInput(e.target.value);
                      if (recipientType !== 'walkin') setIsRecipientDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (recipientType !== 'walkin') setIsRecipientDropdownOpen(true);
                    }}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
                  />

                  {recipientSearchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientSearchInput('');
                        setSelectedRecipient(null);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* RECIPIENT SUGGESTIONS DROPDOWN */}
                {isRecipientDropdownOpen && recipientType !== 'walkin' && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-dark-card border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar backdrop-blur-xl divide-y divide-dark-border/50 animate-fade-in">
                    <div className="p-2.5 bg-dark-hover/70 text-[10px] uppercase font-black tracking-wider text-dark-muted flex items-center justify-between">
                      <span>Matching {recipientType === 'student' ? 'Students' : 'Faculty Staff'} ({recipientSuggestions.length})</span>
                      <span>Click to Select</span>
                    </div>

                    {recipientSuggestions.length === 0 ? (
                      <div className="p-6 text-center text-dark-muted text-xs">
                        No {recipientType === 'student' ? 'students' : 'staff members'} found matching "{recipientSearchInput}". You can still type their name directly.
                      </div>
                    ) : (
                      recipientSuggestions.map((rec) => {
                        const isStudent = recipientType === 'student';
                        const name = rec.name || rec.studentName || 'Member';
                        const sub = isStudent
                          ? `${rec.class || 'Class N/A'} • Roll # ${rec.rollNumber || rec.rollNo || '-'} ${rec.fatherName ? `• S/O ${rec.fatherName}` : ''}`
                          : `${rec.designation || 'Staff'} • ${rec.department || 'Faculty'}`;

                        const bal = Number(rec.balance !== undefined ? rec.balance : (rec.arrears || 0)) || 0;

                        return (
                          <div
                            key={rec.id}
                            onClick={() => handleSelectRecipient(rec)}
                            className="p-3.5 hover:bg-cyan-500/10 cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                isStudent
                                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                  : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              }`}>
                                {name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{name}</p>
                                <p className="text-[11px] text-dark-muted">{sub}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              {isStudent && (
                                <span className={`text-[10px] font-black block ${bal > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  Fee Bal: PKR {bal.toLocaleString()}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg inline-block mt-0.5">
                                Select
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Selected Recipient Card Badge */}
                {selectedRecipient && (
                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-cyan-400 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-black text-white">{selectedRecipient.name}</p>
                        <p className="text-[11px] text-dark-muted">{selectedRecipient.detail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {recipientType === 'student' && (
                        <div className="text-right">
                          <span className="text-[10px] text-dark-muted uppercase font-bold block">Current Fee Arrears</span>
                          <span className={`text-xs font-black ${studentCurrentFeeBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            PKR {studentCurrentFeeBalance.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipient(null);
                          setRecipientSearchInput('');
                        }}
                        className="text-xs text-dark-muted hover:text-red-400 font-bold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* RIGHT 5 COLS: TRANSACTION SUMMARY & FEE RECORD CHECKOUT */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="p-6 space-y-5 bg-gradient-to-b from-dark-card to-dark-hover/30 border-primary-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-dark-border">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ClipboardList className="text-primary-400" size={18} />
                  Checkout & Issuance Details
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                  posMode === 'sale' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {posMode === 'sale' ? 'Direct Sale' : 'Official Issue'}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-dark-muted block">
                  Quantity to Issue / Sell *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPosQuantity(Math.max(1, posQuantity - 1))}
                    className="w-11 h-11 rounded-xl bg-dark-hover border border-dark-border text-white font-bold text-lg hover:bg-dark-card flex items-center justify-center cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedPosItem ? selectedPosItem.quantity : 999}
                    value={posQuantity}
                    onChange={(e) => setPosQuantity(Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-dark-hover border border-dark-border rounded-xl p-3 text-center text-lg font-black text-white focus:border-primary-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const maxQ = selectedPosItem ? selectedPosItem.quantity : 999;
                      setPosQuantity(Math.min(maxQ, posQuantity + 1));
                    }}
                    className="w-11 h-11 rounded-xl bg-dark-hover border border-dark-border text-white font-bold text-lg hover:bg-dark-card flex items-center justify-center cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sale Price or Return Date depending on mode */}
              {posMode === 'sale' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-dark-muted block mb-1">
                        Unit Price (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={posUnitPrice}
                        onChange={(e) => setPosUnitPrice(Number(e.target.value))}
                        className="w-full bg-dark-hover border border-dark-border rounded-xl p-2.5 text-sm text-white focus:border-primary-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-dark-muted block mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={posPaymentMethod}
                        onChange={(e) => setPosPaymentMethod(e.target.value)}
                        className="w-full bg-dark-hover border border-dark-border rounded-xl p-2.5 text-sm text-white focus:border-primary-500 outline-none font-bold"
                      >
                        <option value="fee_challan">💳 Add to Fee Voucher (طالب علم کے فیس میں)</option>
                        <option value="cash">💵 Cash (Counter Payment)</option>
                        <option value="online">🏦 Online / Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  {/* FEE RECORD INTEGRATION PROMINENT CALLOUT */}
                  {recipientType === 'student' && posPaymentMethod === 'fee_challan' && (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-black text-purple-400">
                        <span className="flex items-center gap-1.5">
                          <Receipt size={15} /> Student Fee Voucher Integration Active
                        </span>
                        <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Auto-Linked
                        </span>
                      </div>

                      <p className="text-[11px] text-dark-muted leading-relaxed">
                        Amount of <strong className="text-white">PKR {(posQuantity * posUnitPrice).toLocaleString()}</strong> for{' '}
                        <strong className="text-cyan-400">{selectedPosItem ? selectedPosItem.name : 'product'}</strong> will be added to{' '}
                        <strong className="text-white">{selectedRecipient ? selectedRecipient.name : 'Student'}</strong>'s Fee Ledger and printed itemized on the student's next Monthly Fee Voucher.
                      </p>

                      <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs">
                        <span className="text-dark-muted">Current Fee Arrears:</span>
                        <span className="font-bold text-white">PKR {studentCurrentFeeBalance.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-purple-300">New Total Fee Balance:</span>
                        <span className="text-emerald-400 font-black text-sm">
                          PKR {(studentCurrentFeeBalance + (posQuantity * posUnitPrice)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-dark-muted block mb-1">
                    Expected Return Date (Return to Store)
                  </label>
                  <input
                    type="date"
                    value={posReturnDate}
                    onChange={(e) => setPosReturnDate(e.target.value)}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              )}

              {/* Remarks / Notes */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-dark-muted block mb-1">
                  Purpose / Notes
                </label>
                <input
                  type="text"
                  placeholder="E.g., Uniform purchase, Term 1 curriculum book, ID Card fee..."
                  value={posRemarks}
                  onChange={(e) => setPosRemarks(e.target.value)}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl p-2.5 text-sm text-white focus:border-primary-500 outline-none"
                />
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 rounded-xl bg-dark-card border border-dark-border space-y-2">
                <div className="flex items-center justify-between text-xs text-dark-muted">
                  <span>Selected Item:</span>
                  <span className="font-bold text-white">{selectedPosItem ? selectedPosItem.name : 'None selected'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-muted">
                  <span>Recipient:</span>
                  <span className="font-bold text-cyan-400">
                    {selectedRecipient ? selectedRecipient.name : (recipientSearchInput || 'Not specified')}
                  </span>
                </div>
                {posMode === 'sale' && (
                  <div className="flex items-center justify-between text-base font-black text-white pt-2 border-t border-dark-border/60">
                    <span>Product Amount:</span>
                    <span className="text-emerald-400 text-xl">PKR {(posQuantity * posUnitPrice).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleCompletePosTransaction}
                disabled={!selectedPosItem}
                className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all ${
                  posMode === 'sale'
                    ? (posPaymentMethod === 'fee_challan'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-purple-500/20'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20')
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-black shadow-cyan-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {posMode === 'sale' ? (
                  posPaymentMethod === 'fee_challan' ? (
                    <>
                      <Receipt size={17} /> Add Product Fee to Student Voucher
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={17} /> Complete Direct Sale & Print Slip
                    </>
                  )
                ) : (
                  <>
                    <ArrowRightLeft size={17} /> Confirm Asset Issue
                  </>
                )}
              </button>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: STOCK CATALOG & ASSETS LEDGER
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'items' && (
        <GlassCard className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
            {/* Search & Category Filter */}
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
                <input
                  type="text"
                  placeholder="Search catalog by name, SKU, or room..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-primary-500 outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="bg-dark-hover border border-dark-border rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-primary-500 outline-none"
              >
                <option value="all">All Stock Statuses</option>
                <option value="available">In Stock (Available)</option>
                <option value="low_stock">Low Stock (Restock Alert)</option>
                <option value="out_of_stock">Out of Stock (Zero Units)</option>
              </select>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportStockReport}
                className="p-2.5 bg-dark-hover hover:bg-cyan-500/20 text-cyan-400 rounded-xl transition-all border border-dark-border cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <Download size={15} /> Export CSV
              </button>
            </div>

            <span className="text-xs text-dark-muted font-bold">
              Showing {filteredCatalogItems.length} of {items.length} items
            </span>
          </div>

          {/* Categories Pill Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary-500 text-white shadow'
                    : 'text-dark-muted hover:text-white bg-dark-hover border border-dark-border/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Catalog Table */}
          {filteredCatalogItems.length === 0 ? (
            <div className="py-16 text-center text-dark-muted space-y-3 font-semibold">
              <p>No inventory items found matching your filters.</p>
              <button
                onClick={() => {
                  setCatalogSearch('');
                  setSelectedCategory('All');
                  setStockStatusFilter('all');
                }}
                className="px-4 py-2 bg-dark-hover border border-dark-border rounded-xl text-xs font-bold text-primary-400 hover:text-white cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black bg-dark-hover/40">
                    <th className="py-3.5 px-4">Item Name & SKU</th>
                    <th className="py-3.5 px-4">Category & Location</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4">Unit Sale Price</th>
                    <th className="py-3.5 px-4">Total Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/50 text-sm">
                  {filteredCatalogItems.map((item) => (
                    <tr key={item.id} className="hover:bg-dark-hover/30 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 font-black text-xs shrink-0">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block leading-tight">{item.name}</span>
                            <span className="text-[10px] text-cyan-400 font-mono">{item.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-xs font-bold text-white block">{item.category}</span>
                        <span className="text-[11px] text-dark-muted">📍 {item.room || 'Main Store'}</span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-block ${
                          item.quantity <= 0
                            ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                            : (item.quantity <= (item.minStockAlert || 5)
                                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30 animate-pulse'
                                : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20')
                        }`}>
                          {item.quantity} {item.unit || 'pcs'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-semibold text-white">
                        PKR {Number(item.price).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 font-black text-primary-400">
                        PKR {(Number(item.quantity) * Number(item.price)).toLocaleString()}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          item.quantity <= 0
                            ? 'bg-red-500/20 text-red-400'
                            : (item.quantity <= (item.minStockAlert || 5)
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400')
                        }`}>
                          {item.quantity <= 0 ? 'Out of Stock' : (item.quantity <= (item.minStockAlert || 5) ? 'Low Stock' : 'In Stock')}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick POS Sell / Issue Button */}
                          <button
                            onClick={() => {
                              handleSelectItem(item);
                              setActiveTab('pos');
                            }}
                            title="Issue or Sell Item"
                            className="px-2.5 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500 text-primary-300 hover:text-white border border-primary-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <ShoppingCart size={13} /> POS
                          </button>

                          {/* Restock Button */}
                          <button
                            onClick={() => {
                              setRestockTargetItem(item);
                              setRestockForm({
                                quantity: 10,
                                costPrice: item.costPrice || 0,
                                supplierName: '',
                                invoiceNo: '',
                                notes: ''
                              });
                              setIsRestockModalOpen(true);
                            }}
                            title="Restock Item / Add Inward Stock"
                            className="p-1.5 rounded-lg bg-dark-hover hover:bg-emerald-500/20 text-dark-muted hover:text-emerald-400 border border-dark-border transition-colors cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>

                          {/* Print QR Sticker Label */}
                          <button
                            onClick={() => {
                              setQrLabelItem(item);
                              setIsQrLabelModalOpen(true);
                            }}
                            title="Print QR Code Sticker"
                            className="p-1.5 rounded-lg bg-dark-hover hover:bg-cyan-500/20 text-dark-muted hover:text-cyan-400 border border-dark-border transition-colors cursor-pointer"
                          >
                            <QrCode size={14} />
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditModalOpen(true);
                            }}
                            title="Edit Item Details"
                            className="p-1.5 rounded-lg bg-dark-hover hover:bg-primary-500/20 text-dark-muted hover:text-primary-400 border border-dark-border transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDeleteItem(item)}
                            title="Delete Item"
                            className="p-1.5 rounded-lg bg-dark-hover hover:bg-red-500/20 text-dark-muted hover:text-red-400 border border-dark-border transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: SALES & ISSUANCE LEDGER (STUDENT & STAFF RECORDS)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'sales_ledger' && (
        <GlassCard className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <FileText className="text-primary-400" size={20} />
                Sales & Issuances Audit Ledger
              </h2>
              <p className="text-xs text-dark-muted">
                Detailed record of who received what, fee voucher integration, quantities, and return tracking.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/school-admin/generate-voucher')}
                className="p-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition-all border border-purple-500/30 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <Receipt size={15} /> Open Fee Vouchers
              </button>

              <button
                type="button"
                onClick={handleExportSalesLedger}
                className="p-2.5 bg-dark-hover hover:bg-cyan-500/20 text-cyan-400 rounded-xl transition-all border border-dark-border cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <Download size={15} /> Export Ledger CSV
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
                <input
                  type="text"
                  placeholder="Search by student, staff, item, or invoice #..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-primary-500 outline-none"
                />
              </div>

              {/* Type Filter */}
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="bg-dark-hover border border-dark-border rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-primary-500 outline-none"
              >
                <option value="all">All Recipients & Types</option>
                <option value="student">👨‍🎓 Students Only</option>
                <option value="fee_challan">💳 Added to Fee Voucher (Challan)</option>
                <option value="staff">👩‍🏫 Staff Only</option>
                <option value="sale">🟢 Sales Only (Direct Paid)</option>
                <option value="issue">🔵 Issuances Only (Lent)</option>
              </select>

              {/* Return Status Filter */}
              <select
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value)}
                className="bg-dark-hover border border-dark-border rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-primary-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending_return">⏳ Pending Return (Issued)</option>
                <option value="returned">↩️ Returned to Stock</option>
                <option value="completed">✅ Completed Sales</option>
              </select>
            </div>

            <span className="text-xs text-dark-muted font-bold">
              Showing {filteredSales.length} records
            </span>
          </div>

          {/* Ledger Table */}
          {filteredSales.length === 0 ? (
            <div className="py-16 text-center text-dark-muted space-y-3 font-semibold">
              <p>No sales or issuance records found matching your filters.</p>
              <button
                onClick={() => {
                  setLedgerSearch('');
                  setLedgerTypeFilter('all');
                  setLedgerStatusFilter('all');
                }}
                className="px-4 py-2 bg-dark-hover border border-dark-border rounded-xl text-xs font-bold text-primary-400 hover:text-white cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black bg-dark-hover/40">
                    <th className="py-3.5 px-4">Invoice / Date</th>
                    <th className="py-3.5 px-4">Recipient (Who)</th>
                    <th className="py-3.5 px-4">Item (What)</th>
                    <th className="py-3.5 px-4 text-center">Quantity</th>
                    <th className="py-3.5 px-4">Amount & Payment</th>
                    <th className="py-3.5 px-4">Fee / Return Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/50 text-sm">
                  {filteredSales.map((record) => (
                    <tr key={record.id} className="hover:bg-dark-hover/30 transition-colors">
                      <td className="py-4 px-4 font-mono">
                        <span className="font-bold text-white block">{record.invoiceNo}</span>
                        <span className="text-[10px] text-dark-muted">{record.date}</span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            record.recipientType === 'student'
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}>
                            {record.recipientType === 'student' ? 'ST' : 'SF'}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{record.recipientName}</span>
                            <span className="text-[11px] text-dark-muted">{record.recipientDetail}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-semibold text-white">
                        <span>{record.itemName}</span>
                        <span className="text-[10px] text-dark-muted block">{record.category}</span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-dark-hover border border-dark-border font-bold text-xs">
                          {record.quantity} {record.unit || 'pcs'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {record.type === 'sale' ? (
                          <div>
                            <span className="font-black text-emerald-400 block">PKR {Number(record.totalAmount).toLocaleString()}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                              record.paymentMethod === 'fee_challan' || record.addedToFeeRecord
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-dark-hover text-dark-muted'
                            }`}>
                              {record.paymentMethod === 'fee_challan' ? 'Added to Fee Challan' : record.paymentMethod}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                            Free Asset Issue
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {record.type === 'issue' ? (
                          record.returned ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 flex items-center gap-1 w-fit">
                              <CheckCircle size={12} /> Returned
                            </span>
                          ) : (
                            <div>
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 inline-block">
                                In Possession
                              </span>
                              {record.returnDate && (
                                <span className="text-[10px] text-dark-muted block mt-0.5">
                                  Due: {record.returnDate}
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          record.paymentMethod === 'fee_challan' || record.addedToFeeRecord ? (
                            <div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-block">
                                In Fee Record
                              </span>
                              <span className="text-[10px] text-dark-muted block mt-0.5">
                                {record.linkedVoucher || 'Monthly Voucher'}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 inline-block">
                              Paid (Cash)
                            </span>
                          )
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Return to Stock Button (If active issue) */}
                          {record.type === 'issue' && !record.returned && (
                            <button
                              type="button"
                              onClick={() => handleReturnItemToStock(record)}
                              title="Mark as Returned & Add Stock back"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                            >
                              <ArrowDownLeft size={13} /> Return to Stock
                            </button>
                          )}

                          {/* Print Receipt / Slip */}
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptRecord(record);
                              setIsReceiptModalOpen(true);
                            }}
                            title="Print Store Receipt Slip"
                            className="p-1.5 rounded-lg bg-dark-hover hover:bg-cyan-500/20 text-dark-muted hover:text-cyan-400 border border-dark-border transition-colors cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: PURCHASES & RESTOCK LOG
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'purchases' && (
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-dark-border">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <History className="text-emerald-400" size={20} />
                Stock Purchases & Inward Ledger
              </h2>
              <p className="text-xs text-dark-muted">
                Track new stock purchases, vendor invoices, unit cost prices, and restocking history.
              </p>
            </div>

            <button
              onClick={() => {
                if (items.length > 0) {
                  setRestockTargetItem(items[0]);
                  setRestockForm({
                    quantity: 10,
                    costPrice: items[0].costPrice || 0,
                    supplierName: '',
                    invoiceNo: '',
                    notes: ''
                  });
                  setIsRestockModalOpen(true);
                }
              }}
              className="premium-button-primary py-2.5 px-4 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-primary-500/20"
            >
              <Plus size={16} /> New Stock Restock
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="py-16 text-center text-dark-muted font-semibold">
              No purchase logs found. Click "New Stock Restock" to record inward shipments.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black bg-dark-hover/40">
                    <th className="py-3.5 px-4">Date & Invoice</th>
                    <th className="py-3.5 px-4">Item Restocked</th>
                    <th className="py-3.5 px-4">Supplier / Vendor</th>
                    <th className="py-3.5 px-4 text-center">Units Added</th>
                    <th className="py-3.5 px-4">Unit Cost</th>
                    <th className="py-3.5 px-4">Total Cost</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/50 text-sm">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-dark-hover/30 transition-colors">
                      <td className="py-4 px-4 font-mono">
                        <span className="font-bold text-white block">{pur.invoiceNo || 'PUR-REF'}</span>
                        <span className="text-[10px] text-dark-muted">{pur.date}</span>
                      </td>

                      <td className="py-4 px-4 font-bold text-white">
                        <span>{pur.itemName}</span>
                      </td>

                      <td className="py-4 px-4 text-xs font-semibold text-cyan-400">
                        {pur.supplierName || 'General Supplier'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs">
                          +{pur.quantityAdded} {pur.unit || 'pcs'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-semibold text-white">
                        PKR {Number(pur.costPrice).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 font-black text-emerald-400">
                        PKR {Number(pur.totalCost).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-xs text-dark-muted">
                        {pur.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 1: QR & BARCODE SCANNER (CAMERA & BARCODE GUN)
      ══════════════════════════════════════════════════════════════ */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <GlassCard className="w-full max-w-md p-6 bg-dark-card/95 border-cyan-500/30 relative shadow-2xl space-y-4">
            <button
              onClick={() => {
                setIsScannerModalOpen(false);
                stopCameraScanner();
              }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <ScanBarcode className="text-cyan-400" size={22} />
                Scan Item 2D QR / Barcode
              </h3>
              <p className="text-xs text-dark-muted">
                Scan with webcam/phone camera or plug in your USB barcode scanner gun.
              </p>
            </div>

            {/* Mode Switcher: Camera vs Barcode Gun */}
            <div className="grid grid-cols-2 gap-2 bg-dark-hover p-1 rounded-xl border border-dark-border">
              <button
                type="button"
                onClick={() => setScannerType('camera')}
                className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scannerType === 'camera'
                    ? 'bg-cyan-500 text-black shadow'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                <Camera size={14} /> Camera Scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  setScannerType('barcode_gun');
                  stopCameraScanner();
                }}
                className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scannerType === 'barcode_gun'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                <ScanBarcode size={14} /> 2D Barcode Gun
              </button>
            </div>

            {/* Camera Box */}
            {scannerType === 'camera' && (
              <div className="space-y-3">
                <div
                  id="inventory-camera-box"
                  className="w-full h-64 rounded-2xl overflow-hidden bg-black/60 relative border border-cyan-500/30"
                />

                <div className="flex items-center justify-between text-xs text-dark-muted">
                  <span>Aim camera at item QR code</span>
                  <button
                    type="button"
                    onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Flip Camera
                  </button>
                </div>
              </div>
            )}

            {/* Hardware Barcode Gun Box */}
            {scannerType === 'barcode_gun' && (
              <form onSubmit={handleBarcodeGunSubmit} className="space-y-3">
                <div className="p-4 rounded-xl bg-dark-hover border border-dark-border text-center space-y-2">
                  <ScanBarcode size={32} className="mx-auto text-emerald-400 animate-pulse" />
                  <p className="text-xs font-bold text-white">Barcode Gun Ready</p>
                  <p className="text-[11px] text-dark-muted">
                    Point your handheld scanner at the item sticker or type the item code below.
                  </p>
                </div>

                <input
                  ref={barcodeGunInputRef}
                  type="text"
                  autoFocus
                  placeholder="Scan barcode or type item SKU (e.g. inv-101) & Enter..."
                  value={barcodeGunInput}
                  onChange={(e) => setBarcodeGunInput(e.target.value)}
                  className="w-full bg-dark-hover border border-emerald-500/40 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none text-center font-mono"
                />

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Confirm Code
                </button>
              </form>
            )}

            {/* Error Message */}
            {scannerError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 2: PRINTABLE QR CODE LABEL / STICKER
      ══════════════════════════════════════════════════════════════ */}
      {isQrLabelModalOpen && qrLabelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <GlassCard className="w-full max-w-sm p-6 bg-dark-card/95 border-cyan-500/30 relative shadow-2xl text-center space-y-4">
            <button
              onClick={() => {
                setIsQrLabelModalOpen(false);
                setQrLabelItem(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-lg font-black text-white">Item Asset Tag</h3>
              <p className="text-xs text-dark-muted">Print label to attach on books, boxes, or equipment.</p>
            </div>

            {/* Printable Sticker Tag Box */}
            <div id="printable-qr-tag" className="p-5 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 shadow-xl space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1">
                {schoolName}
              </p>

              <div className="py-2 flex justify-center">
                <QRCode value={qrLabelItem.id} size={130} />
              </div>

              <div className="space-y-0.5">
                <p className="text-sm font-black text-slate-900 leading-tight">{qrLabelItem.name}</p>
                <p className="text-[11px] font-bold text-slate-600">Category: {qrLabelItem.category}</p>
                <div className="flex items-center justify-between text-[11px] pt-1 font-mono text-slate-700">
                  <span>ID: {qrLabelItem.id}</span>
                  <span className="font-bold">PKR {Number(qrLabelItem.price).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Printer size={15} /> Print Asset Sticker
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 3: PRINTABLE STORE SALE / ISSUANCE RECEIPT
      ══════════════════════════════════════════════════════════════ */}
      {isReceiptModalOpen && receiptRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <GlassCard className="w-full max-w-lg p-6 md:p-8 bg-dark-card/95 border-primary-500/30 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <button
              onClick={() => {
                setIsReceiptModalOpen(false);
                setReceiptRecord(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Printable Receipt Paper */}
            <div id="printable-store-receipt" className="p-6 rounded-2xl bg-white text-slate-900 space-y-4 shadow-xl border border-slate-200">
              {/* Header */}
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{schoolName}</h2>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {receiptRecord.type === 'sale'
                    ? (receiptRecord.paymentMethod === 'fee_challan' ? 'Store Product Fee Receipt (Added to Monthly Voucher)' : 'Official Store Sale Slip')
                    : 'Store Asset Issuance Voucher'}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600 mt-2 font-mono">
                  <span>Voucher #: <strong>{receiptRecord.invoiceNo}</strong></span>
                  <span>Date: {receiptRecord.date}</span>
                </div>
              </div>

              {/* Recipient Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase font-bold text-[10px]">Issued / Sold To:</span>
                  <span className="font-black text-slate-900 capitalize">{receiptRecord.recipientType}</span>
                </div>
                <p className="text-sm font-black text-slate-900">{receiptRecord.recipientName}</p>
                <p className="text-slate-600 font-medium">{receiptRecord.recipientDetail}</p>
                {receiptRecord.recipientPhone && (
                  <p className="text-slate-500 text-[10px]">Contact: {receiptRecord.recipientPhone}</p>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500 font-black">
                    <th className="py-1.5">Item Description</th>
                    <th className="py-1.5 text-center">Qty</th>
                    <th className="py-1.5 text-right">Unit Price</th>
                    <th className="py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">
                      {receiptRecord.itemName}
                      <span className="block text-[10px] text-slate-500 font-normal">{receiptRecord.category}</span>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-800">
                      {receiptRecord.quantity} {receiptRecord.unit || 'pcs'}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      PKR {Number(receiptRecord.unitPrice).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-black text-slate-900">
                      PKR {Number(receiptRecord.totalAmount).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Summary */}
              <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Method</span>
                  <span className="text-xs font-black text-slate-800 uppercase">
                    {receiptRecord.type === 'sale'
                      ? (receiptRecord.paymentMethod === 'fee_challan' ? 'Included in Student Monthly Fee Voucher' : receiptRecord.paymentMethod.replace('_', ' '))
                      : 'Official School Assignment'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Amount</span>
                  <span className="text-xl font-black text-slate-900">
                    PKR {Number(receiptRecord.totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Fee Voucher Notice if applicable */}
              {receiptRecord.paymentMethod === 'fee_challan' && (
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-[10px] text-purple-900 font-semibold space-y-0.5">
                  <p>💳 <strong>Fee Record Linked:</strong> This charge has been added to student's fee ledger balance.</p>
                  <p className="text-purple-700">It will appear itemized on the student's monthly fee voucher alongside tuition fees.</p>
                </div>
              )}

              {/* Issuance Condition Warning if Issue */}
              {receiptRecord.type === 'issue' && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-semibold">
                  ⚠️ Note: This item is official school property lent for academic use. Expected Return Date: <strong>{receiptRecord.returnDate || 'End of Term'}</strong>.
                </div>
              )}

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1">
                  Store Incharge Signature
                </div>
                <div className="border-t border-slate-300 pt-1">
                  Receiver Signature
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {receiptRecord.paymentMethod === 'fee_challan' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    navigate('/school-admin/generate-voucher');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt size={14} /> Open Fee Vouchers
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setReceiptRecord(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-dark-muted hover:text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary-500/20"
                >
                  <Printer size={15} /> Print Receipt
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 4: RESTOCK INWARD MODAL
      ══════════════════════════════════════════════════════════════ */}
      {isRestockModalOpen && restockTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <GlassCard className="w-full max-w-md p-6 bg-dark-card/95 border-emerald-500/30 relative shadow-2xl space-y-4">
            <button
              onClick={() => {
                setIsRestockModalOpen(false);
                setRestockTargetItem(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Plus className="text-emerald-400" size={22} /> Restock Inventory
            </h3>
            <p className="text-xs text-dark-muted">
              Add new stock for <strong className="text-white">"{restockTargetItem.name}"</strong> (Currently {restockTargetItem.quantity} {restockTargetItem.unit} in store).
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1">
                    Units to Add *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1">
                    Cost Price (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={restockForm.costPrice}
                    onChange={(e) => setRestockForm({ ...restockForm, costPrice: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  placeholder="E.g., Oxford Press Depot, Master Uniforms"
                  value={restockForm.supplierName}
                  onChange={(e) => setRestockForm({ ...restockForm, supplierName: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1">
                  Vendor Bill / Invoice Reference
                </label>
                <input
                  type="text"
                  placeholder="E.g., SUP-9082"
                  value={restockForm.invoiceNo}
                  onChange={(e) => setRestockForm({ ...restockForm, invoiceNo: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-dark-hover text-dark-muted hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 5: ADD NEW ITEM TO CATALOG
      ══════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <GlassCard className="w-full max-w-lg p-6 md:p-8 bg-dark-card/95 border-primary-500/30 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
              <Package className="text-primary-500" size={24} /> Add New Store Asset
            </h3>
            <p className="text-xs text-dark-muted mb-6">
              Register books, uniform kits, stationery, electronics, or lab equipment.
            </p>

            <form onSubmit={handleAddItemSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                  Asset / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Oxford Math Grade 10, Navy Blue Blazer, Lab Microscope"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Category *
                  </label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  >
                    {DEFAULT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Room / Shelf Location
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Book Depot Shelf A, Lab 2"
                    value={newItemForm.room}
                    onChange={(e) => setNewItemForm({ ...newItemForm, room: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItemForm.quantity}
                    onChange={(e) => setNewItemForm({ ...newItemForm, quantity: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Unit Type
                  </label>
                  <select
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  >
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="boxes">boxes</option>
                    <option value="reams">reams</option>
                    <option value="units">units</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Sale Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Purchase / Cost Price (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemForm.costPrice}
                    onChange={(e) => setNewItemForm({ ...newItemForm, costPrice: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemForm.minStockAlert}
                    onChange={(e) => setNewItemForm({ ...newItemForm, minStockAlert: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-dark-muted hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20 cursor-pointer"
                >
                  <Send size={15} /> Save to Inventory Catalog
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 6: EDIT EXISTING ASSET
      ══════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <GlassCard className="w-full max-w-lg p-6 md:p-8 bg-dark-card/95 border-primary-500/30 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingItem(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
              <Edit2 className="text-primary-500" size={24} /> Edit Asset Details
            </h3>
            <p className="text-xs text-dark-muted mb-6">
              Update pricing, quantity, or location for "{editingItem.name}".
            </p>

            <form onSubmit={handleEditItemSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                  Asset / Item Name
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Category
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  >
                    {DEFAULT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Room / Shelf Location
                  </label>
                  <input
                    type="text"
                    value={editingItem.room || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, room: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Unit Type
                  </label>
                  <select
                    value={editingItem.unit || 'pcs'}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  >
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="boxes">boxes</option>
                    <option value="reams">reams</option>
                    <option value="units">units</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">
                    Sale Price (PKR)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-dark-muted hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20 cursor-pointer"
                >
                  <Send size={15} /> Update Asset
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
