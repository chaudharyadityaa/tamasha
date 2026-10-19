package com.eventhub.admin;

import jakarta.validation.constraints.NotNull;

public record ChangeEnabledRequest(@NotNull Boolean enabled) {
}