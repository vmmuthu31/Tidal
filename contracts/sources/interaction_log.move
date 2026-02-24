module sui_crm::interaction_log {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::TxContext;
    use std::string::String;
    use sui::transfer;
    use sui::event;

    public struct InteractionLog has key, store {
        id: UID,
        profile_id: ID,
        action: String,
        timestamp: u64,
    }

    public struct InteractionEvent has copy, drop {
        profile_id: ID,
        action: String,
        timestamp: u64,
    }

    public fun log_interaction(
        profile_id: ID,
        action: String,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let log = InteractionLog {
            id: object::new(ctx),
            profile_id,
            action,
            timestamp,
        };
        
        event::emit(InteractionEvent {
            profile_id,
            action,
            timestamp,
        });

        transfer::transfer(log, tx_context::sender(ctx));
    }
}
