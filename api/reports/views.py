from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Sum, Count
from django.db.models.functions import TruncHour
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# --- App Imports ---
from sales.models import Sale, SaleItem, SalePayment
from production.models import ProductionRun, IngredientUsage, Product
from users.models import User

# ==========================================
# HELPER: Excel Styling & Formatting
# ==========================================

class ExcelStyler:
    """
    Handles design: Big titles, readable tables, simple colors.
    """
    def __init__(self):
        # Professional but friendly colors (Navy Blue & White theme)
        self.header_bg = "203764" # Deep Navy Blue
        self.header_text = "FFFFFF" # White
        self.total_bg = "DDEBF7"  # Very Light Blue
        self.zebra_stripe = "F7F7F7" # Almost white grey
        
        # Borders
        self.thin_border = Side(border_style="thin", color="BFBFBF")
        self.thick_border = Side(border_style="medium", color="000000")
        self.border_full = Border(left=self.thin_border, right=self.thin_border, 
                                  top=self.thin_border, bottom=self.thin_border)
        
        # Fonts
        self.font_title = Font(name='Calibri', size=18, bold=True, color="203764")
        self.font_subtitle = Font(name='Calibri', size=12, italic=True, color="595959")
        self.font_header = Font(name='Calibri', size=11, bold=True, color=self.header_text)
        self.font_total = Font(name='Calibri', size=11, bold=True)
        self.font_body = Font(name='Calibri', size=11)
        
        # Alignments
        self.align_center = Alignment(horizontal='center', vertical='center')
        self.align_left = Alignment(horizontal='left', vertical='center')
        self.align_right = Alignment(horizontal='right', vertical='center')

    def add_sheet_header(self, ws, title, subtitle):
        """Adds the big text at the top of the sheet"""
        ws['A1'] = title
        ws['A1'].font = self.font_title
        
        ws['A2'] = subtitle
        ws['A2'].font = self.font_subtitle
        
        # Merge cells slightly so text doesn't get cut off
        ws.merge_cells('A1:F1') 
        ws.merge_cells('A2:F2')

    def create_table(self, ws, headers, data, sum_columns=None):
        """
        Standard table generator.
        """
        if sum_columns is None:
            sum_columns = []

        start_row = 4

        # 1. Write Headers
        ws.append([]) 
        ws.append(headers) # Row 4
        
        for cell in ws[start_row]:
            cell.fill = PatternFill(start_color=self.header_bg, end_color=self.header_bg, fill_type="solid")
            cell.font = self.font_header
            cell.alignment = self.align_center
            cell.border = self.border_full

        # 2. Write Data
        totals = {col_idx: 0.0 for col_idx in sum_columns}
        
        for i, row_data in enumerate(data):
            ws.append(row_data)
            current_row = ws[ws.max_row]
            
            # Zebra Striping
            is_even = (i % 2 == 0)
            fill = PatternFill(start_color=self.zebra_stripe, end_color=self.zebra_stripe, fill_type="solid") if is_even else None
            
            for col_idx, cell in enumerate(current_row):
                cell.font = self.font_body
                cell.border = self.border_full
                if fill:
                    cell.fill = fill
                
                if isinstance(cell.value, (int, float)):
                    cell.number_format = '#,##0.00'
                
                if col_idx in sum_columns and isinstance(cell.value, (int, float)):
                    totals[col_idx] += cell.value

        # 3. Write Totals Row
        if sum_columns and data:
            total_row_data = [""] * len(headers)
            total_row_data[0] = "GRAND TOTAL"
            
            for col_idx, total_val in totals.items():
                total_row_data[col_idx] = total_val
                
            ws.append(total_row_data)
            row_cells = ws[ws.max_row]
            
            for cell in row_cells:
                cell.font = self.font_total
                cell.fill = PatternFill(start_color=self.total_bg, end_color=self.total_bg, fill_type="solid")
                cell.border = Border(top=self.thick_border, bottom=self.thick_border, left=self.thin_border, right=self.thin_border)
                if isinstance(cell.value, (int, float)):
                    cell.number_format = '#,##0.00'

        self.adjust_column_widths(ws)

    def adjust_column_widths(self, ws):
        """
        Smart column width adjustment that handles Merged Cells correctly.
        """
        for col in ws.columns:
            max_length = 0
            # FIX: Use get_column_letter to avoid AttributeError on MergedCells
            column_letter = get_column_letter(col[0].column)
            
            for cell in col:
                # Skip title rows
                if cell.row < 3: 
                    continue
                try:
                    if cell.value:
                        length = len(str(cell.value))
                        if length > max_length:
                            max_length = length
                except:
                    pass
            
            adjusted_width = max_length + 3
            if adjusted_width < 12: adjusted_width = 12
            if adjusted_width > 50: adjusted_width = 50
            
            ws.column_dimensions[column_letter].width = adjusted_width


# ==========================================
# VIEW 1: JSON Dashboard Stats
# ==========================================

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            date_str = timezone.now().date().isoformat()
        
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Hourly Sales
        hourly_sales = Sale.objects.filter(created_at__date=target_date)\
            .annotate(hour=TruncHour('created_at'))\
            .values('hour')\
            .annotate(total=Sum('total_amount'))\
            .order_by('hour')
        
        hourly_data = []
        for item in hourly_sales:
            hourly_data.append({
                "hour": item['hour'].strftime('%H:%M'),
                "total": float(item['total'])
            })

        # 2. Top 5 Selling Products
        top_products = SaleItem.objects.filter(sale__created_at__date=target_date)\
            .values('product__name')\
            .annotate(quantity=Sum('quantity'))\
            .order_by('-quantity')[:5]
        
        top_products_data = [
            {"name": item['product__name'], "quantity": float(item['quantity'])} 
            for item in top_products
        ]

        # 3. Payment Method Distribution
        payment_methods = SalePayment.objects.filter(sale__created_at__date=target_date)\
            .values('method__name')\
            .annotate(total=Sum('amount'))\
            .order_by('-total')
        
        payment_data = [
            {"name": item['method__name'], "value": float(item['total'])}
            for item in payment_methods
        ]

        # 4. Production vs Sales
        top_produced = ProductionRun.objects.filter(date_produced__date=target_date, product__isnull=False)\
            .values('product__name')\
            .annotate(produced=Sum('quantity_produced'))\
            .order_by('-produced')[:5]
        
        prod_vs_sales_data = []
        for item in top_produced:
            product_name = item['product__name']
            produced_qty = float(item['produced'])
            sold_qty = SaleItem.objects.filter(
                sale__created_at__date=target_date, 
                product__name=product_name
            ).aggregate(total=Sum('quantity'))['total'] or 0
            
            prod_vs_sales_data.append({
                "name": product_name,
                "produced": produced_qty,
                "sold": float(sold_qty)
            })

        # 5. Wastage
        wastage = IngredientUsage.objects.filter(production_run__date_produced__date=target_date)\
            .values('ingredient__name')\
            .annotate(total_wastage=Sum('wastage'))\
            .order_by('-total_wastage')[:5]
        
        wastage_data = [{"name": item['ingredient__name'], "wastage": float(item['total_wastage'])} for item in wastage]

        # 6. Cashier
        cashier_perf = Sale.objects.filter(created_at__date=target_date)\
            .values('cashier__username', 'cashier__full_name')\
            .annotate(total_sales=Sum('total_amount'), count=Count('id'))\
            .order_by('-total_sales')
        
        cashier_data = [
            {
                "name": item['cashier__full_name'] or item['cashier__username'], 
                "sales": float(item['total_sales']),
                "count": item['count']
            }
            for item in cashier_perf
        ]

        # 7. Stock
        products_in_stock = Product.objects.filter(stock_quantity__gt=0).count()

        return Response({
            "hourly_sales": hourly_data,
            "top_products": top_products_data,
            "payment_methods": payment_data,
            "production_vs_sales": prod_vs_sales_data,
            "wastage": wastage_data,
            "cashier_performance": cashier_data,
            "products_in_stock": products_in_stock
        })


# ==========================================
# VIEW 2: Excel Report Export
# ==========================================

class ExportReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not start_date_str or not end_date_str:
            return Response({"error": "start_date and end_date are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        wb = openpyxl.Workbook()
        styler = ExcelStyler()

        # ==========================================
        # SHEET 1: OVERVIEW
        # ==========================================
        ws_overview = wb.active
        ws_overview.title = "Business Snapshot"
        ws_overview.sheet_view.showGridLines = False 

        total_money_in = Sale.objects.filter(created_at__date__range=[start_date, end_date]).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        count_sales = Sale.objects.filter(created_at__date__range=[start_date, end_date]).count()
        avg_spend = total_money_in / count_sales if count_sales > 0 else 0
        
        try:
            from inventory.models import Purchase
            total_money_out = Purchase.objects.filter(purchase_date__date__range=[start_date, end_date]).aggregate(Sum('total_cost'))['total_cost__sum'] or 0
        except ImportError:
            total_money_out = 0

        styler.add_sheet_header(ws_overview, "Business Snapshot", f"Report from {start_date} to {end_date}")

        def add_summary_line(row, label, value, is_money=False, bold_value=False):
            cell_lbl = ws_overview.cell(row=row, column=2, value=label)
            cell_val = ws_overview.cell(row=row, column=3, value=value)
            
            cell_lbl.font = Font(name='Calibri', size=11)
            cell_lbl.border = Border(bottom=Side(style='thin', color='CCCCCC'))
            
            cell_val.font = Font(name='Calibri', size=11, bold=bold_value)
            cell_val.alignment = Alignment(horizontal='right')
            cell_val.border = Border(bottom=Side(style='thin', color='CCCCCC'))
            
            if is_money:
                cell_val.number_format = '#,##0.00'

        ws_overview['B5'] = "Money Coming In"
        ws_overview['B5'].font = Font(name='Calibri', bold=True, size=12, color="203764")
        
        add_summary_line(6, "Total Sales Amount", float(total_money_in), True, True)
        add_summary_line(7, "Number of Sales Made", count_sales)
        add_summary_line(8, "Avg. Amount per Customer", float(avg_spend), True)
        
        ws_overview['B10'] = "Money Going Out"
        ws_overview['B10'].font = Font(name='Calibri', bold=True, size=12, color="203764")
        
        add_summary_line(11, "Cost of Ingredients Bought", float(total_money_out), True)

        ws_overview['B13'] = "Estimated Profit"
        ws_overview['B13'].font = Font(name='Calibri', bold=True, size=12, color="203764")
        
        est_profit = float(total_money_in) - float(total_money_out)
        ws_overview['B14'] = "Sales minus Purchases"
        ws_overview['C14'] = est_profit
        ws_overview['C14'].number_format = '#,##0.00'
        ws_overview['C14'].font = Font(bold=True, size=12, color="006100" if est_profit >= 0 else "9C0006")

        ws_overview.column_dimensions['A'].width = 5
        ws_overview.column_dimensions['B'].width = 30
        ws_overview.column_dimensions['C'].width = 25

        # ==========================================
        # SHEET 2: SALES LIST
        # ==========================================
        ws_sales = wb.create_sheet("Sales List")
        styler.add_sheet_header(ws_sales, "Detailed Sales List", "List of every receipt generated")
        
        headers = ["Date", "Time", "Receipt #", "Cashier Name", "Items Sold", "Amount Paid"]
        
        sales_qs = Sale.objects.filter(created_at__date__range=[start_date, end_date])\
            .select_related('cashier')\
            .prefetch_related('items__product')\
            .order_by('-created_at')
            
        data = []
        for s in sales_qs:
            items = ", ".join([f"{i.product.name} ({i.quantity})" for i in s.items.all()])
            cashier_name = s.cashier.full_name if s.cashier and s.cashier.full_name else (s.cashier.username if s.cashier else "Unknown")
            
            data.append([
                s.created_at.date(),
                s.created_at.time().strftime('%H:%M'),
                str(s.id), 
                cashier_name,
                items,
                float(s.total_amount)
            ])
            
        styler.create_table(ws_sales, headers, data, sum_columns=[5])

        # ==========================================
        # SHEET 3: BEST SELLERS
        # ==========================================
        ws_prod = wb.create_sheet("Best Sellers")
        styler.add_sheet_header(ws_prod, "Product Performance", "Which items are making the most money?")

        headers = ["Item Name", "Count Sold", "Money Earned", "Count Made in Kitchen", "Current Stock"]
        
        products = Product.objects.filter(is_active=True)
        data = []
        
        for p in products:
            sold_agg = SaleItem.objects.filter(sale__created_at__date__range=[start_date, end_date], product=p)\
                .aggregate(q=Sum('quantity'), r=Sum('subtotal'))
            
            prod_agg = ProductionRun.objects.filter(date_produced__date__range=[start_date, end_date], product=p)\
                .aggregate(q=Sum('quantity_produced'))
                
            qty_sold = sold_agg['q'] or 0
            money_earned = float(sold_agg['r'] or 0)
            qty_made = prod_agg['q'] or 0
            
            if qty_sold > 0 or qty_made > 0: 
                data.append([p.name, qty_sold, money_earned, qty_made, p.stock_quantity])

        data.sort(key=lambda x: x[2], reverse=True)
        styler.create_table(ws_prod, headers, data, sum_columns=[1, 2, 3])

        # ==========================================
        # SHEET 4: KITCHEN ACTIVITY (Merged & Styled)
        # ==========================================
        ws_run = wb.create_sheet("Kitchen Activity")
        styler.add_sheet_header(ws_run, "Production & Waste", "What the kitchen made and what was wasted")

        headers = ["Date & Time", "Chef Name", "Item Made", "Qty Made", "Ingredient Used", "Amount Used", "Amount Wasted"]
        
        # 1. Write Headers
        ws_run.append([]) 
        ws_run.append(headers) # Row 4
        
        header_row_idx = 4
        for cell in ws_run[header_row_idx]:
            cell.fill = PatternFill(start_color=styler.header_bg, end_color=styler.header_bg, fill_type="solid")
            cell.font = styler.font_header
            cell.alignment = styler.align_center
            cell.border = styler.border_full

        # 2. Fetch Data
        usages = IngredientUsage.objects.filter(production_run__date_produced__date__range=[start_date, end_date])\
            .select_related('production_run', 'ingredient')\
            .order_by('-production_run__date_produced') # Sort by run is crucial for merging

        # 3. Custom Loop for Merging
        current_row = 5
        start_merge_row = 5
        last_run_id = None
        
        # Zebra Striping logic for groups requires tracking "group index"
        group_idx = 0
        fill_color = None

        total_made = 0
        total_used = 0
        total_wasted = 0

        # We append a 'dummy' None at the end to force the merge logic to trigger for the last group
        usage_list = list(usages)
        usage_list.append(None) 

        for u in usage_list:
            if u is None:
                # End of list, trigger last merge
                run_id = -1
            else:
                run_id = u.production_run.id
            
            # CHECK GROUP CHANGE
            if last_run_id is not None and run_id != last_run_id:
                # Merge the Previous Group (Cols A, B, C, D)
                if current_row > start_merge_row:
                    # Merge Date
                    ws_run.merge_cells(start_row=start_merge_row, start_column=1, end_row=current_row-1, end_column=1)
                    # Merge Chef
                    ws_run.merge_cells(start_row=start_merge_row, start_column=2, end_row=current_row-1, end_column=2)
                    # Merge Item
                    ws_run.merge_cells(start_row=start_merge_row, start_column=3, end_row=current_row-1, end_column=3)
                    # Merge Qty
                    ws_run.merge_cells(start_row=start_merge_row, start_column=4, end_row=current_row-1, end_column=4)
                    
                    # Apply Vertical Center to the merged cells
                    ws_run.cell(row=start_merge_row, column=1).alignment = Alignment(horizontal='center', vertical='center')
                    ws_run.cell(row=start_merge_row, column=2).alignment = Alignment(horizontal='center', vertical='center')
                    ws_run.cell(row=start_merge_row, column=3).alignment = Alignment(horizontal='center', vertical='center')
                    ws_run.cell(row=start_merge_row, column=4).alignment = Alignment(horizontal='center', vertical='center')

                start_merge_row = current_row
                group_idx += 1
            
            if u is None: break # Exit loop

            # Prepare Colors for this group
            if group_idx % 2 == 0:
                fill_color = PatternFill(start_color=styler.zebra_stripe, end_color=styler.zebra_stripe, fill_type="solid")
            else:
                fill_color = None

            # Get Values
            run = u.production_run
            item_name = run.product.name if run.product else (run.composite_ingredient.name if run.composite_ingredient else "Mix/Prep")
            chef_name = run.chef.full_name if run.chef and run.chef.full_name else (run.chef.username if run.chef else "Unknown")
            
            # Format: YYYY-MM-DD HH:MM
            dt_str = run.date_produced.strftime('%Y-%m-%d %H:%M')

            # Write Row
            ws_run.append([
                dt_str,
                chef_name,
                item_name,
                float(run.quantity_produced),
                u.ingredient.name,
                float(u.actual_amount),
                float(u.wastage)
            ])

            # Apply Styles to the new row
            row_cells = ws_run[current_row]
            for col_idx, cell in enumerate(row_cells):
                cell.font = styler.font_body
                cell.border = styler.border_full
                if fill_color:
                    cell.fill = fill_color
                
                # Number formats
                if col_idx in [3, 5, 6]: # Qty, Used, Wasted
                    cell.number_format = '#,##0.00'

            # Add to Totals (Only add Production Qty once per group)
            # Logic: If this is the FIRST row of a new group, add to production total.
            # Usage totals are always added.
            if run_id != last_run_id:
                total_made += run.quantity_produced
            
            total_used += u.actual_amount
            total_wasted += u.wastage

            last_run_id = run_id
            current_row += 1

        # 4. Totals Row for Kitchen
        ws_run.append(["GRAND TOTAL", "", "", total_made, "", total_used, total_wasted])
        
        last_row = ws_run[ws_run.max_row]
        for cell in last_row:
            cell.font = styler.font_total
            cell.fill = PatternFill(start_color=styler.total_bg, end_color=styler.total_bg, fill_type="solid")
            cell.border = Border(top=styler.thick_border, bottom=styler.thick_border, left=styler.thin_border, right=styler.thin_border)
            if isinstance(cell.value, (int, float)):
                cell.number_format = '#,##0.00'
        
        # Merge the empty cells in the total row for cleaner look (optional)
        ws_run.merge_cells(start_row=ws_run.max_row, start_column=1, end_row=ws_run.max_row, end_column=3)

        styler.adjust_column_widths(ws_run)


        # ==========================================
        # SHEET 5: TEAM STATS
        # ==========================================
        ws_cashier = wb.create_sheet("Team Stats")
        styler.add_sheet_header(ws_cashier, "Staff Performance", "Who is selling the most?")

        headers = ["Staff Name", "Total Money Collected", "Customers Served", "Avg Sale Amount"]
        
        c_stats = Sale.objects.filter(created_at__date__range=[start_date, end_date])\
            .values('cashier__full_name', 'cashier__username')\
            .annotate(total=Sum('total_amount'), count=Count('id'))\
            .order_by('-total')
            
        data = []
        for c in c_stats:
            name = c['cashier__full_name'] or c['cashier__username'] or "Unknown"
            tot = float(c['total'])
            cnt = c['count']
            avg = tot / cnt if cnt else 0
            data.append([name, tot, cnt, avg])
            
        styler.create_table(ws_cashier, headers, data, sum_columns=[1, 2])

        # ==========================================
        # RETURN FILE
        # ==========================================
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        filename = f"Shop_Report_{start_date}_{end_date}.xlsx"
        response['Content-Disposition'] = f'attachment; filename={filename}'
        wb.save(response)
        return response