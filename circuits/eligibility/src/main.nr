use dep::std;

// Define the circuit for rental eligibility verification
// This circuit proves that a tenant meets certain criteria without revealing the actual values

fn main(
    // Private inputs (witnesses) - these are kept secret
    age: u32,
    income: u32,
    credit_score: u32,
    employment_status: u32, // 0 = unemployed, 1 = employed, 2 = self-employed
    rental_history: u32, // 0 = no history, 1 = good history, 2 = bad history
    
    // Public inputs - these are revealed
    min_age: pub u32,
    min_income: pub u32,
    min_credit_score: pub u32,
) -> pub bool {
    // Verify age requirement
    assert(age >= min_age, "Age requirement not met");
    
    // Verify income requirement
    assert(income >= min_income, "Income requirement not met");
    
    // Verify credit score requirement
    assert(credit_score >= min_credit_score, "Credit score requirement not met");
    
    // Verify employment status (must be employed or self-employed)
    assert(employment_status == 1 || employment_status == 2, "Must be employed or self-employed");
    
    // Verify rental history (must have good or no history)
    assert(rental_history == 0 || rental_history == 1, "Rental history must be good or none");
    
    // Additional business logic
    // Income should be at least 3x the rent amount (this would be passed as public input in practice)
    // For now, we'll use a simple multiplier check
    let income_multiplier = income / 1000; // Assuming income is in thousands
    assert(income_multiplier >= 3, "Income insufficient for rent");
    
    // Credit score should be above 600
    assert(credit_score >= 600, "Credit score too low");
    
    // Age should be between 18 and 80
    assert(age >= 18, "Too young");
    assert(age <= 80, "Too old");
    
    // Return true if all checks pass
    true
}
