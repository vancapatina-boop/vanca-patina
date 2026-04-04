# Quick Setup & Development Guide
## Vanca Patina - Phase 2 Ready

**Last Updated:** February 2026
**For:** Developers & QA Team

---

## ⚡ 30-Second Quick Start

```bash
# Backend
cd vanca-patina/backend
npm start
# Runs on http://localhost:5000

# Frontend (new terminal)
cd vanca-patina/frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 📝 Phase 2 Changes at a Glance

| What Changed | Where | Impact |
|-------------|-------|--------|
| Branding fix | Navbar, Footer | "VANCA PATINA" instead of "VANCA INTERIO" |
| Product gallery | ProductDetail page | Multiple images with zoom and thumbnails |
| Type updates | types/product.ts | Added `images?: string[]` field |
| Image mapping | mapBackendProduct.ts | Maps API images array correctly |
| Admin dashboard | Already working | Multiple image upload verified |

---

## 🧪 Test the Changes (5 minutes)

### 1. Check Header Branding
```
1. Go to http://localhost:5173
2. Look at navbar
3. Should see "VANCA PATINA" (not "VANCA INTERIO PATINA")
```

### 2. Test Product Gallery
```
1. Go to http://localhost:5173/shop
2. Click any product
3. See image gallery with:
   - Main image display
   - Thumbnail thumbnails below (or side scroll on mobile)
   - Hover zoom effect on desktop
   - Navigation arrows when hovering
```

### 3. Test Admin Multiple Images
```
1. Go to http://localhost:5173/admin (if logged in as admin)
2. Create new product or edit existing
3. Upload multiple images
4. See all images display in product detail page
```

### 4. Mobile Test
```
1. Open DevTools (F12)
2. Click responsive mode (Ctrl+Shift+M)
3. Select iPhone 12/Galaxy S20
4. Navigate to product page
5. See:
   - Single column layout
   - Thumbnails as horizontal scroll (not grid)
   - Full-width buttons (44px+ height)
```

---

## 📂 Key Files (If You Need to Modify)

### Frontend

**Product Gallery** (NEW)
```
src/components/ProductGallery.tsx
├─ Main image display with zoom
├─ Desktop grid thumbnails
├─ Mobile scroll thumbnails
└─ Image error fallback
```

**Product Detail** (UPDATED)
```
src/pages/ProductDetail.tsx
├─ Imports ProductGallery
└─ Passes images array to gallery
```

**Type Definitions** (UPDATED)
```
src/types/product.ts
└─ Added: images?: string[]

src/lib/mapBackendProduct.ts
└─ Maps images array from API
```

**Navigation** (UPDATED)
```
src/components/Navbar.tsx (Line 40-44)
src/components/Footer.tsx (Line 6)
├─ Changed branding to "VANCA PATINA"
└─ Fixed footer company name
```

### Backend

**Product Model** (NO CHANGES - Already existed)
```
models/product.js
└─ Has: images: [String] field
```

**Product Controller** (NO CHANGES - Works as-is)
```
controllers/productController.js
├─ getProductById returns full product with images
├─ Admin upload endpoint works for multiple files
└─ All endpoints return images array
```

---

## 🔗 API Quick Reference

### Get Product with Images
```bash
curl http://localhost:5000/api/products/PRODUCT_ID
```

**Response shows:**
```json
{
  "_id": "...",
  "name": "Product Name",
  "price": 599,
  "image": "/uploads/main.jpg",
  "images": [
    "/uploads/main.jpg",
    "/uploads/alt1.jpg",
    "/uploads/alt2.jpg"
  ]
}
```

### Upload Product Image (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/products/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "productId=PRODUCT_ID" \
  -F "image=@/path/to/image.jpg"
```

---

## 🎯 Common Development Tasks

### Add a New Product with Multiple Images

**Step 1: Create Product**
```bash
POST /api/admin/products
{
  "name": "New Product",
  "price": 799,
  "category": "patinas",
  "description": "...",
  "stock": 50,
  "finishType": "Glossy",
  "image": "/uploads/main.jpg"  # Can be blank
}
```

**Step 2: Upload Images** (do this 2-3 times)
```bash
POST /api/admin/products/upload
FormData:
  productId: <returned_id>
  image: <file>
```

**Result:** Product shows all 3 images in gallery

### Test on Different Devices

**Desktop:**
```
Chrome > F12 > Responsive Mode > Desktop
- Check: 4-column thumbnail grid
- Check: Hover zoom works
- Check: Navigation arrows appear on hover
```

**Tablet:**
```
DevTools > iPad Air
- Check: 2-column thumbnail grid
- Check: Proper spacing
```

**Mobile:**
```
DevTools > iPhone 12
- Check: Single column layout
- Check: Horizontal scroll thumbnails
- Check: Thumb-sized touch targets
```

---

## 🐛 Troubleshooting

### Gallery Not Showing Images

**Issue:** Images array empty on product detail
**Debug:**
```javascript
// In browser console on product detail page
// Check the product data
console.log(product);
// Should have: images: ["/uploads/...", ...]
```

**Fix:** Make sure product has images uploaded via admin panel

### Mobile Thumbnails Not Scrolling

**Issue:** Horizontal scroll not working on mobile
**Debug:**
```html
<!-- Check if element has overflow-x-auto class -->
<!-- In ProductGallery.tsx, mobile section line ~70 -->
```

**Fix:** Verify `overflow-x-auto` class is present on mobile div

### Images Not Loading

**Issue:** Broken image icons displayed
**Log:**
```javascript
// Check browser console for errors
// Should fallback to defaultProductImage
```

**Fix:** Verify image URLs are valid when uploaded to server

### Branding Still Says "Interio"

**Issue:** Old branding text visible
**Solution:**
```bash
# Hard refresh browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
# Or clear browser cache
# Navbar.tsx and Footer.tsx have been updated
```

---

## 📊 Testing Checklist

### Frontend Testing
- [ ] Header shows "VANCA PATINA"
- [ ] Footer shows "VANCA PATINA"
- [ ] Product gallery displays correctly
- [ ] Main image shows when product loads
- [ ] Thumbnails display below/side
- [ ] Can click thumbnail to change main image
- [ ] Hover zoom works on desktop
- [ ] Navigation arrows appear on desktop hover
- [ ] Image counter shows (e.g., "1 / 3")
- [ ] Mobile: Thumbnails scroll horizontally
- [ ] Mobile: Single column layout
- [ ] Error image shows default placeholder
- [ ] Add to cart button works
- [ ] Wishlist button works
- [ ] Quantity selector works

### Mobile Testing
- [ ] All text readable without zooming
- [ ] Buttons at least 44px tall
- [ ] Tappable areas at least 48x48px
- [ ] No horizontal scrolling on main content
- [ ] Images scale properly
- [ ] Touch gestures work for carousel
- [ ] No overlapping elements

### API Testing
- [ ] GET /api/products returns images array
- [ ] GET /api/products/:id returns images array
- [ ] Admin can upload multiple images
- [ ] Images display in product detail
- [ ] Product gallery handles missing images gracefully

### Performance
- [ ] Page loads in < 3 seconds
- [ ] Smooth scrolling on mobile
- [ ] Images load within 1 second each
- [ ] No layout shift when images load (CLS)

---

## 📚 Documentation Reference

**For detailed info, see:**
- [ECOMMERCE_GUIDELINES.md](ECOMMERCE_GUIDELINES.md) - Best practices & mobile responsive details
- [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) - Complete API reference with curl examples
- [PHASE_2_IMPLEMENTATION_REPORT.md](PHASE_2_IMPLEMENTATION_REPORT.md) - Full implementation details

---

## 🚀 Useful npm Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Watch mode tests

# Backend
npm start            # Start production server
npm run dev          # Start with nodemon (if configured)
npm test             # Run tests
```

---

## 🔐 Important Security Notes

1. **Never commit .env files**
   - Backend: .env (Razorpay keys, DB credentials)
   - Frontend: .env.local (API URL)

2. **Always use environment variables for:**
   - API URLs
   - Razorpay keys
   - Database URLs
   - JWT secrets

3. **Test sensitive flows:**
   - Payment verification
   - User authentication
   - Admin product creation
   - Image upload

---

## 📞 Quick Help

### "Images still show old branding text"
```bash
# Hard refresh browser
# Windows: Ctrl + Shift + R
# Mac: Cmd + Shift + R
# Or: Ctrl + Shift + Delete (Clear browsing data) then refresh
```

### "ProductGallery component not found"
```bash
# Make sure file exists at:
# frontend/src/components/ProductGallery.tsx

# If missing, recreate from:
# PHASE_2_IMPLEMENTATION_REPORT.md "File Changes" section
```

### "Thumbnails not showing on mobile"
```bash
# Check ProductDetail.tsx uses ProductGallery correctly
# Line should show:
# <ProductGallery images={product.images || [product.image]} ... />
```

### "API returning error on product fetch"
```bash
# Check MongoDB is running
# Check backend .env has correct DB URL
# Check API is running on port 5000
# Check CORS is enabled
```

---

## 🎓 Learning Resources

### Understanding the Gallery Component
- Read: [ProductGallery.tsx](frontend/src/components/ProductGallery.tsx) (200 lines, well-commented)
- Components used: Lucide icons, TailwindCSS, React hooks
- Responsive: Uses TailwindCSS breakpoints (md:, lg:)

### Understanding the Data Flow
1. Backend API: `/api/products/:id` returns `{..., images: [...]}`
2. Frontend: `useProducts` hook fetches data
3. Mapping: `mapBackendProduct` normalizes image URLs
4. Display: `ProductGallery` component renders gallery
5. Interaction: Click thumbnails, hover zoom

### Understanding Mobile Responsiveness
- Use: TailwindCSS responsive classes (`md:`, `lg:`)
- Test: Firefox DevTools Responsive Mode (most accurate)
- Debug: Check computed styles in Elements panel

---

## 🏁 Completion Checklist

Before declaring Phase 2 complete:

- [x] Navbar branding changed to "VANCA PATINA"
- [x] Footer branding updated
- [x] ProductGallery component created
- [x] ProductDetail uses ProductGallery
- [x] Product type includes images array
- [x] mapBackendProduct maps images correctly
- [x] Admin image upload works
- [x] Mobile responsive layout verified
- [x] All APIs tested and documented
- [x] Button functionality verified
- [x] Documentation completed
- [x] No console errors on main pages

**Status: ✅ COMPLETE AND READY FOR PRODUCTION**

---

**Created:** February 2026
**For Questions:** Refer to ECOMMERCE_GUIDELINES.md or API_TESTING_GUIDE.md
**Last Updated:** February 2026
