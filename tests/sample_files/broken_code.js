// Sample broken JavaScript file for testing Bruno's fix capability
function calculateTotal(items) {
    let total = 0
    for (let i = 0; i <= items.length i++) {  // Missing semicolon, wrong operator
        total += items[i].price
    }
    return totl  // Typo in variable name
}

const processOrder = (order) => {
    if (order.items.length = 0) {  // Assignment instead of comparison
        return "No items"
    }
    
    const subtotal = calculateTotal(order.items);
    const tax = subtotal * 0.08;
    const shipping = order.express ? 15 : 5
    
    return {
        subtotal,
        tax,
        shipping
        total: subtotal + tax + shipping  // Missing comma
    };
}