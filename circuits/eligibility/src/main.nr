fn main(
    // Public inputs (exposed to verifier)
    min_age: pub u32,
    income_mul: pub u32,
    rent_wei: pub u32,
    need_clean_rec: pub u32,
    policy_id: pub u32,
    nullifier: pub Field,
    
    // Private inputs (witness only)
    age: u32,
    income: u32,
    criminal_flag: u32,
    user_id: Field,
    salt: Field,
) {
    // Constraint 1: age >= min_age
    assert(age >= min_age, "Age requirement not met");

    // Constraint 2: income >= income_mul * rent_wei
    let required_income = income_mul * rent_wei;
    assert(income >= required_income, "Income requirement not met");

    // Constraint 3: If need_clean_rec == 1 then criminal_flag == 0
    // This is equivalent to: (need_clean_rec == 0) OR (criminal_flag == 0)
    // Using the logical equivalence: A -> B is equivalent to !A OR B
    let clean_rec_not_required = 1 - need_clean_rec;
    let has_clean_record = 1 - criminal_flag;
    let clean_record_condition = clean_rec_not_required + has_clean_record - (clean_rec_not_required * has_clean_record);
    assert(clean_record_condition == 1, "Clean record requirement not met");

    // Constraint 4: Compute nullifier = hash(user_id, policy_id, salt)
    // For now, we'll use a simple hash function
    // In production, this should be replaced with Poseidon
    let computed_nullifier = user_id + policy_id as Field + salt;
    
    // Constraint 5: Verify the provided nullifier matches the computed one
    assert(computed_nullifier == nullifier, "Nullifier mismatch");

    // Additional constraints for input validation
    // Ensure boolean fields are 0 or 1
    assert(need_clean_rec * (1 - need_clean_rec) == 0, "need_clean_rec must be 0 or 1");
    assert(criminal_flag * (1 - criminal_flag) == 0, "criminal_flag must be 0 or 1");
    
    // Ensure positive values for age and income
    assert(age > 0, "Age must be positive");
    assert(income > 0, "Income must be positive");
    
    // Ensure policy_id is positive
    assert(policy_id > 0, "Policy ID must be positive");
    
    // Ensure salt is non-zero for uniqueness
    assert(salt != 0, "Salt must be non-zero");
}