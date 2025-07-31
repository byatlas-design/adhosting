// DPA Carousel Ads

class DPACarousel {
    constructor(containerId, adSize) {
        this.container = document.getElementById(containerId);
        this.adSize = adSize;
        this.products = [];
        this.currentIndex = 0;
        this.feedUrl = 'https://files-as.intelligentreach.com/feedexports/1d79b2cf-0502-4678-9b31-e6ff7c73d485/Kurt_Geiger_US_ByAtlas_Retargeting.csv';
        
        this.init();
    }
    
    async init() {
        this.showSplashScreen();
        
        // Start loading products immediately but don't wait for splash to finish
        setTimeout(async () => {
            try {
                await this.loadProducts();
                await this.transitionToAd();
            } catch (error) {
                console.error('Error in init:', error);
                // If everything fails, show a simple fallback ad
                this.showFallbackAd();
            }
        }, 100); // Much shorter delay
    }
    
    
    async transitionToAd() {
        // Fade out splash screen
        const splashContainer = this.container.querySelector('.dpa-ad');
        if (splashContainer) {
            splashContainer.style.transition = 'opacity 0.5s ease-out';
            splashContainer.style.opacity = '0';
            
            // Wait for fade out to complete
            setTimeout(async () => {
                try {
                    this.render();
                    this.bindEvents();
                    
                    // Fade in the ad content
                    const adContainer = this.container.querySelector('.dpa-ad');
                    if (adContainer) {
                        adContainer.style.opacity = '0';
                        adContainer.style.transition = 'opacity 0.5s ease-in';
                        // Force reflow
                        adContainer.offsetHeight;
                        adContainer.style.opacity = '1';
                    }
                } catch (error) {
                    console.error('Error rendering ad:', error);
                    this.showFallbackAd();
                }
            }, 500);
        } else {
            // No splash screen, go directly to rendering
            try {
                this.render();
                this.bindEvents();
            } catch (error) {
                console.error('Error rendering ad:', error);
                this.showFallbackAd();
            }
        }
    }
    
    showSplashScreen() {
        // Determine the correct splash image path based on current location and ad size
        let splashImagePath;
        if (window.location.pathname.includes('/ads/')) {
            splashImagePath = `../${this.adSize}.jpg`;
        } else {
            splashImagePath = `${this.adSize}.jpg`;
        }
        
        this.container.innerHTML = `
            <div class="dpa-ad ad-${this.adSize}" style="position: relative; overflow: hidden;">
                <img src="${splashImagePath}" 
                     alt="Kurt Geiger" 
                     style="width: 100%; height: 100%; object-fit: cover; display: block;"
                     onerror="this.style.display='none';">
            </div>
        `;
    }
    
    showFallbackAd() {
        // Simple fallback ad that always works in TradeDesk
        this.container.innerHTML = `
            <div class="dpa-ad ad-${this.adSize}" style="position: relative; overflow: hidden; background: #f7f7f9; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; box-sizing: border-box;">
                <div style="margin-bottom: 20px;">
                    <svg width="120" height="30" viewBox="0 0 120 30" style="fill: #333;">
                        <text x="60" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold">KURT GEIGER</text>
                    </svg>
                </div>
                <div style="color: #333; font-size: 14px; line-height: 1.4; font-family: Arial, sans-serif;">
                    <div style="font-weight: bold; margin-bottom: 10px;">New Collection</div>
                    <div style="margin-bottom: 15px;">Discover our latest bags & accessories</div>
                    <div style="background: #333; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: inline-block;" data-cta-action="fallback-shop">
                        Shop Now
                    </div>
                </div>
            </div>
        `;
    }
    
    showLoading() {
        this.container.innerHTML = `
            <div class="dpa-ad ad-${this.adSize}">
                <div class="loading">Loading products...</div>
            </div>
        `;
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="dpa-ad ad-${this.adSize}">
                <div class="error">${message}</div>
            </div>
        `;
    }
    
    async loadProducts() {
        try {
            console.log('Attempting to load products from:', this.feedUrl);
            const response = await this.fetchWithFallback(this.feedUrl);
            const csvText = await response.text();
            console.log('CSV loaded, parsing products...');
            this.products = this.parseCSV(csvText);
            console.log('Parsed products:', this.products.length);
            // Load products based on ad size: 12 for 160x600, 8 for 728x90, 10 for others
            let productCount;
            if (this.adSize === '160x600') {
                productCount = 12; // 3 products per slide = 4 slides
            } else if (this.adSize === '728x90') {
                productCount = 8;  // 4 products per slide = 2 slides
            } else {
                productCount = 10; // 1 product per slide = 10 slides
            }
            this.products = this.products.slice(0, productCount);
        } catch (error) {
            console.log('Failed to load from CSV, using mock products:', error.message);
            this.products = this.getMockProducts();
        }
    }
    
    async fetchWithFallback(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return response;
        } catch (error) {
            throw new Error('CORS or network error');
        }
    }
    
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const products = [];
        
        // Find the column indices for the fields we need
        const titleIndex = headers.indexOf('title');
        const priceIndex = headers.indexOf('price');
        const imageIndex = headers.indexOf('image_link');
        const linkIndex = headers.indexOf('link');
        const idIndex = headers.indexOf('id');
        const categoryIndex = headers.indexOf('product_type');
        const genderIndex = headers.indexOf('gender');
        
        for (let i = 1; i < Math.min(lines.length, 200); i++) { // Check more rows to find valid products
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const title = titleIndex >= 0 ? values[titleIndex]?.replace(/"/g, '').trim() : '';
                const price = priceIndex >= 0 ? values[priceIndex]?.replace(/"/g, '').trim() : '';
                const imageLink = imageIndex >= 0 ? values[imageIndex]?.replace(/"/g, '').trim() : '';
                const productLink = linkIndex >= 0 ? values[linkIndex]?.replace(/"/g, '').trim() : '';
                const id = idIndex >= 0 ? values[idIndex]?.replace(/"/g, '').trim() : i;
                const category = categoryIndex >= 0 ? values[categoryIndex]?.replace(/"/g, '').trim().toLowerCase() : '';
                const gender = genderIndex >= 0 ? values[genderIndex]?.replace(/"/g, '').trim().toLowerCase() : '';
                
                // Filter for WOMEN BAGS only
                const isWomenBag = (gender.includes('women') || gender.includes('female')) && 
                                  (category.includes('bag') || category.includes('handbag') || category.includes('purse') || 
                                   title.toLowerCase().includes('bag') || title.toLowerCase().includes('handbag') || 
                                   title.toLowerCase().includes('purse') || title.toLowerCase().includes('clutch') || 
                                   title.toLowerCase().includes('tote') || title.toLowerCase().includes('shoulder'));
                
                // Only add products that have all required fields and are women's bags
                if (title && price && imageLink && title !== 'title' && isWomenBag) {
                    products.push({
                        id: id || i,
                        title: title,
                        price: price.includes('£') ? price : `£${price}`,
                        image: imageLink,
                        link: productLink || '#'
                    });
                    
                    // Stop when we have enough products
                    if (products.length >= 15) break;
                }
            }
        }
        
        return products.length > 0 ? products : this.getMockProducts();
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }
    
    getMockProducts() {
        const allProducts = [
            {
                id: "5045654679078",
                title: "KURT GEIGER Women's Cross Body Bag Pink Leather Kensington",
                price: "£139.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0425357109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/cross-body-bags/kensington-pink-leather-cross-body-bag-5045654679078.html"
            },
            {
                id: "5045654684522",
                title: "Kurt Geiger Women's Cross Body Bag Green Combination Leather Mini Kensington",
                price: "£89.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0433375109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/cross-body-bags/mini-kensington-green-combination-leather-cross-body-bag-5045654684522.html"
            },
            {
                id: "5045654684577",
                title: "Kurt Geiger London Women's Cross Body Bag Multi Other Soft Kensington",
                price: "£79.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0433569789_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/cross-body-bags/soft-kensington-multi-other-cross-body-bag-5045654684577.html"
            },
            {
                id: "5045654689107",
                title: "Kurt Geiger Women's Shoulder Bag Multi Other Kensington Ruffle",
                price: "£69.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0440469789_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/shoulder-bags/kensington-ruffle-multi-other-shoulder-bag-5045654689107.html"
            },
            {
                id: "5045654689145",
                title: "Kurt Geiger London Women's Shoulder Bag Other Kensington XXL Leather",
                price: "£159.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0440999109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/shoulder-bags/kensington-xxl-other-leather-shoulder-bag-5045654689145.html"
            },
            {
                id: "5045654837911",
                title: "Kurt Geiger London Women's Cross Body Bag Black Recycled Multi Pockets",
                price: "£59.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0441405229_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/cross-body-bags/multi-pockets-black-recycled-cross-body-bag-5045654837911.html"
            },
            {
                id: "5045654689923",
                title: "Kurt Geiger London Women's Cross Body Bag Black Leather Hackney",
                price: "£129.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0444400109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/cross-body-bags/hackney-black-leather-cross-body-bag-5045654689923.html"
            },
            {
                id: "5045654690010",
                title: "Kurt Geiger London Women's Tote Bag Black Leather Kensington",
                price: "£179.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0444567109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/tote-bags/kensington-black-leather-tote-bag-5045654690010.html"
            },
            {
                id: "5045654690027",
                title: "Kurt Geiger London Women's Clutch Bag Gold Metallic Mini Kensington",
                price: "£99.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0444789109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/clutch-bags/mini-kensington-gold-metallic-clutch-bag-5045654690027.html"
            },
            {
                id: "5045654690034",
                title: "Kurt Geiger London Women's Shoulder Bag Navy Leather Kensington",
                price: "£149.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0444856109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/shoulder-bags/kensington-navy-leather-shoulder-bag-5045654690034.html"
            },
            {
                id: "5045654690041",
                title: "Kurt Geiger London Women's Cross Body Bag Red Leather Mini Kensington",
                price: "£119.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0444923109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/cross-body-bags/mini-kensington-red-leather-cross-body-bag-5045654690041.html"
            },
            {
                id: "5045654690058",
                title: "Kurt Geiger London Women's Handbag White Leather Kensington",
                price: "£189.00",
                image: "http://kg-static-cache.s3.amazonaws.com/catalog/product/cache/thumbnail/2000x2000/0/4/0445012109_20.jpg",
                link: "https://www.kurtgeiger.us/women/bags/handbags/kensington-white-leather-handbag-5045654690058.html"
            }
        ];

        // Return different amounts based on ad size
        if (this.adSize === '160x600') {
            return allProducts.slice(0, 12); // 12 products for 4 slides of 3 each
        } else if (this.adSize === '728x90') {
            return allProducts.slice(0, 8);  // 8 products for 2 slides of 4 each
        } else {
            return allProducts.slice(0, 10); // 10 products for other formats
        }
    }
    
    render() {
        // Track ad impression for retargeting
        this.trackAdImpression();
        
        // Determine the correct logo path based on current location and ad size
        let logoPath;
        if (this.adSize === '300x250' || this.adSize === '300x600') {
            logoPath = window.location.pathname.includes('/ads/') ? '../logo_stripped.png' : 'logo_stripped.png';
        } else {
            logoPath = window.location.pathname.includes('/ads/') ? '../logo.svg' : 'logo.svg';
        }
        
        let slidesHtml;
        let dotsHtml;
        
        if (this.adSize === '160x600') {
            // For 160x600, group products into sets of 3 per slide
            const productsPerSlide = 3;
            const slides = [];
            for (let i = 0; i < this.products.length; i += productsPerSlide) {
                slides.push(this.products.slice(i, i + productsPerSlide));
            }
            
            slidesHtml = slides.map((slideProducts, slideIndex) => `
                <div class="product-slide">
                    <div class="product-content">
                        <div class="product-stack">
                            ${slideProducts.map(product => `
                                <div class="product-item">
                                    <div class="product-image-container" 
                                         style="cursor: pointer;"
                                         data-product-id="${product.id}"
                                         data-product-title="${product.title}"
                                         data-product-price="${product.price}"
                                         data-product-category="women-bags"
                                         data-product-url="${product.link}">
                                        <img src="${product.image}" 
                                             alt="${product.title}" 
                                             class="product-image"
                                             onerror="this.src='https://via.placeholder.com/100x100/f0f0f0/666?text=No+Image'">
                                    </div>
                                    <div class="product-info">
                                        <div class="product-title">${product.title}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('');
            
            dotsHtml = slides.map((_, index) => 
                `<div class="dot ${index === 0 ? 'active' : ''}" data-slide-index="${index}"></div>`
            ).join('');
            
            // Update the number of slides for navigation
            this.totalSlides = slides.length;
        } else if (this.adSize === '728x90') {
            // For 728x90, group products into sets of 4 per slide
            const productsPerSlide = 4;
            const slides = [];
            for (let i = 0; i < this.products.length; i += productsPerSlide) {
                slides.push(this.products.slice(i, i + productsPerSlide));
            }
            
            slidesHtml = slides.map((slideProducts, slideIndex) => `
                <div class="product-slide">
                    <div class="product-content">
                        <div class="product-row">
                            ${slideProducts.map(product => `
                                <div class="product-item">
                                    <div class="product-image-container" 
                                         style="cursor: pointer;"
                                         data-product-id="${product.id}"
                                         data-product-title="${product.title}"
                                         data-product-price="${product.price}"
                                         data-product-category="women-bags"
                                         data-product-url="${product.link}">
                                        <img src="${product.image}" 
                                             alt="${product.title}" 
                                             class="product-image"
                                             onerror="this.src='https://via.placeholder.com/60x60/f0f0f0/666?text=No+Image'">
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('');
            
            dotsHtml = slides.map((_, index) => 
                `<div class="dot ${index === 0 ? 'active' : ''}" data-slide-index="${index}"></div>`
            ).join('');
            
            // Update the number of slides for navigation
            this.totalSlides = slides.length;
        } else {
            // Regular single product per slide layout
            slidesHtml = this.products.map(product => `
                <div class="product-slide">
                    <div class="product-content">
                        <div class="product-image-container" 
                             style="cursor: pointer;"
                             data-product-id="${product.id}"
                             data-product-title="${product.title}"
                             data-product-price="${product.price}"
                             data-product-category="women-bags"
                             data-product-url="${product.link}">
                            <img src="${product.image}" 
                                 alt="${product.title}" 
                                 class="product-image"
                                 onerror="this.src='https://via.placeholder.com/200x200/f0f0f0/666?text=No+Image'">
                        </div>
                        <div class="product-info">
                            <div class="product-title">${product.title}</div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            dotsHtml = this.products.map((_, index) => 
                `<div class="dot ${index === 0 ? 'active' : ''}" data-slide-index="${index}"></div>`
            ).join('');
            
            this.totalSlides = this.products.length;
        }
        
        this.container.innerHTML = `
            <div class="dpa-ad ad-${this.adSize}">
                <div class="logo-container">
                    <img src="${logoPath}" alt="Kurt Geiger" class="logo">
                </div>
                
                <div class="carousel-container">
                    <div class="carousel-track" id="carousel-track">
                        ${slidesHtml}
                    </div>
                    
                    <div class="carousel-dots" id="carousel-dots">
                        ${dotsHtml}
                    </div>
                </div>
                
                <div class="cta-bar" data-cta-action="shop-now">
                    SHOP NOW
                </div>
            </div>
        `;
        
        this.track = document.getElementById('carousel-track');
        this.dots = document.getElementById('carousel-dots');
    }
    
    goToSlide(index) {
        const maxIndex = this.totalSlides || this.products.length;
        if (index >= 0 && index < maxIndex) {
            this.currentIndex = index;
            this.updateCarousel();
        }
    }
    
    nextSlide() {
        const maxIndex = this.totalSlides || this.products.length;
        this.currentIndex = (this.currentIndex + 1) % maxIndex;
        this.updateCarousel();
    }
    
    prevSlide() {
        const maxIndex = this.totalSlides || this.products.length;
        this.currentIndex = (this.currentIndex - 1 + maxIndex) % maxIndex;
        this.updateCarousel();
    }
    
    updateCarousel() {
        if (!this.track) return;
        
        const translateX = -this.currentIndex * 100;
        this.track.style.transform = `translateX(${translateX}%)`;
        
        // Update dots
        const dots = this.dots.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });
    }
    
    bindEvents() {
        // Add click handlers for product images
        this.addProductClickHandlers();
        
        // Add click handlers for dots navigation
        this.addDotClickHandlers();
        
        // Add click handler for CTA button
        this.addCTAClickHandler();
        
        // Auto-rotation
        this.startAutoRotation();
        
        // Pause auto-rotation on hover
        this.container.addEventListener('mouseenter', () => {
            this.pauseAutoRotation();
        });
        
        this.container.addEventListener('mouseleave', () => {
            this.startAutoRotation();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
    }
    
    addProductClickHandlers() {
        // Add click event listeners to all product image containers
        const productContainers = this.container.querySelectorAll('.product-image-container');
        productContainers.forEach(container => {
            container.addEventListener('click', () => {
                const productId = container.getAttribute('data-product-id');
                const productTitle = container.getAttribute('data-product-title');
                const productPrice = container.getAttribute('data-product-price');
                const productUrl = container.getAttribute('data-product-url');
                
                this.trackProductClick(productId, productTitle, productPrice, productUrl);
            });
        });
    }
    
    addDotClickHandlers() {
        // Add click event listeners to navigation dots
        const dots = this.container.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.goToSlide(index);
            });
        });
    }
    
    addCTAClickHandler() {
        // Add click event listener to CTA button
        const ctaButton = this.container.querySelector('[data-cta-action="shop-now"]');
        if (ctaButton) {
            ctaButton.addEventListener('click', () => {
                this.handleCTAClick();
            });
        }
        
        // Add fallback CTA handler for fallback ad
        const fallbackCTA = this.container.querySelector('[data-cta-action="fallback-shop"]');
        if (fallbackCTA) {
            fallbackCTA.addEventListener('click', () => {
                window.open('https://www.kurtgeiger.com', '_blank');
            });
        }
    }
    
    startAutoRotation() {
        this.pauseAutoRotation();
        this.autoRotationInterval = setInterval(() => {
            this.nextSlide();
        }, 4000);
    }
    
    pauseAutoRotation() {
        if (this.autoRotationInterval) {
            clearInterval(this.autoRotationInterval);
            this.autoRotationInterval = null;
        }
    }
    
    handleCTAClick() {
        // Get the current product link
        let currentProduct;
        if (this.adSize === '160x600') {
            // For 160x600, get the first product from the current slide
            const productsPerSlide = 3;
            const startIndex = this.currentIndex * productsPerSlide;
            currentProduct = this.products[startIndex];
        } else if (this.adSize === '728x90') {
            // For 728x90, get the first product from the current slide
            const productsPerSlide = 4;
            const startIndex = this.currentIndex * productsPerSlide;
            currentProduct = this.products[startIndex];
        } else {
            // For other formats, get the current single product
            currentProduct = this.products[this.currentIndex];
        }
        
        if (currentProduct && currentProduct.link && currentProduct.link !== '#') {
            // Use tracking method for CTA clicks too
            this.trackProductClick(currentProduct.id, currentProduct.title, currentProduct.price, currentProduct.link);
        } else {
            // Fallback to Kurt Geiger main shop page
            window.open('https://www.kurtgeiger.us/', '_blank');
        }
    }
    
    trackProductClick(productId, productTitle, productPrice, productUrl) {
        // Track product interaction for retargeting
        const trackingData = {
            event: 'product_click',
            product_id: productId,
            product_title: productTitle,
            product_price: productPrice,
            product_url: productUrl,
            product_category: 'women-bags',
            ad_size: this.adSize,
            timestamp: new Date().toISOString()
        };
        
        // Send to Google Analytics 4 (if available)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'select_item', {
                item_list_id: 'dpa_carousel',
                item_list_name: 'DPA Carousel',
                items: [{
                    item_id: productId,
                    item_name: productTitle,
                    item_category: 'women-bags',
                    price: parseFloat(productPrice.replace('£', '')),
                    quantity: 1
                }]
            });
        }
        
        // Send to Facebook Pixel (if available)
        if (typeof fbq !== 'undefined') {
            fbq('track', 'ViewContent', {
                content_ids: [productId],
                content_name: productTitle,
                content_category: 'women-bags',
                value: parseFloat(productPrice.replace('£', '')),
                currency: 'GBP'
            });
        }
        
        // Send to TradeDesk pixel (if available)
        if (typeof TTDUniversalPixelApi !== 'undefined') {
            var universalPixelApi = new TTDUniversalPixelApi();
            universalPixelApi.track({
                event: 'ViewItem',
                advertiser_id: 't9yh63f',
                pixel_id: 'avpork4', // Conversion pixel for product clicks
                product_id: productId,
                value: parseFloat(productPrice.replace('£', '')),
                currency: 'GBP'
            });
        }
        
        // Custom retargeting data layer push
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(trackingData);
        
        // Console log for debugging
        console.log('Product click tracked:', trackingData);
        
        // Open the product URL
        window.open(productUrl, '_blank');
    }
    
    trackAdImpression() {
        // Track ad impression for retargeting
        const impressionData = {
            event: 'ad_impression',
            ad_size: this.adSize,
            product_count: this.products.length,
            timestamp: new Date().toISOString()
        };
        
        // Send to Google Analytics 4 (if available)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'view_item_list', {
                item_list_id: 'dpa_carousel',
                item_list_name: 'DPA Carousel',
                items: this.products.slice(0, 5).map(product => ({
                    item_id: product.id,
                    item_name: product.title,
                    item_category: 'women-bags',
                    price: parseFloat(product.price.replace('£', '')),
                    quantity: 1
                }))
            });
        }
        
        // Send to Facebook Pixel (if available)
        if (typeof fbq !== 'undefined') {
            fbq('track', 'ViewContent', {
                content_type: 'product_group',
                content_ids: this.products.map(p => p.id),
                content_category: 'women-bags'
            });
        }
        
        // Send to TradeDesk pixel (if available)
        if (typeof TTDUniversalPixelApi !== 'undefined') {
            var universalPixelApi = new TTDUniversalPixelApi();
            universalPixelApi.track({
                event: 'ViewItemList',
                advertiser_id: 't9yh63f',
                pixel_id: 'scvvpdr', // Sitewide pixel for impressions
                content_type: 'product_group',
                content_ids: this.products.map(p => p.id),
                content_category: 'women-bags'
            });
        }
        
        // Custom retargeting data layer push
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(impressionData);
        
        console.log('Ad impression tracked:', impressionData);
    }
}

// TradeDesk-safe global variable initialization
(function() {
    'use strict';
    
    // Ensure window.dpaCarousel is available for external references
    if (typeof window !== 'undefined') {
        window.dpaCarousel = null;
    }
    
    // Legacy global variable for backward compatibility
    if (typeof globalThis !== 'undefined' && !globalThis.dpaCarousel) {
        globalThis.dpaCarousel = null;
    }
})();
